'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_DRAWER_COMMAND = '27,112,0,60,120';
const DRAWER_COMMANDS = [
  '27,112,0,60,120',
  '27,112,0,25,250',
  '27,112,1,60,120',
  '16,20,1,0,5',
];

function ensureWindows() {
  if (process.platform !== 'win32') throw new Error('Local POS hardware is supported on Windows only.');
}

function runPowerShell(args, timeout = 15000) {
  ensureWindows();
  return execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args,
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
  }).trim();
}

function retireLegacyConnector() {
  if (process.platform !== 'win32') return { ok: true, skipped: true };
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "Stop-ScheduledTask -TaskName 'PayMyDineLocalPosAgent' -ErrorAction SilentlyContinue",
    "Unregister-ScheduledTask -TaskName 'PayMyDineLocalPosAgent' -Confirm:$false -ErrorAction SilentlyContinue",
    "$p=@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*PayMyDine\\LocalPosAgent\\agent.js*' })",
    "$p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    "Write-Output ('RETIRED=' + $p.Count)",
  ].join(';');
  try {
    return { ok: true, output: runPowerShell(['-Command', script], 10000) };
  } catch (error) {
    // Migration is best-effort. The desktop hardware path must still start.
    return { ok: false, message: error.message };
  }
}

function listPrinters() {
  const script = [
    "$ErrorActionPreference='Stop'",
    "$rows=@(Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PortName,Default,Network,WorkOffline,PrinterStatus)",
    "$rows | ConvertTo-Json -Compress",
  ].join(';');
  const output = runPowerShell(['-Command', script]);
  if (!output) return [];
  const parsed = JSON.parse(output);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map((row) => ({
    name: String(row.Name || ''),
    driver: String(row.DriverName || ''),
    port: String(row.PortName || ''),
    default: Boolean(row.Default),
    network: Boolean(row.Network),
    offline: Boolean(row.WorkOffline),
    status: row.PrinterStatus,
  })).filter((row) => row.name);
}

function resolvePrinterName(requested) {
  const explicit = String(requested || '').trim();
  if (explicit) return explicit;
  const printers = listPrinters().filter((row) => !row.offline);
  const preferred = printers.find((row) => row.default) || (printers.length === 1 ? printers[0] : null);
  if (!preferred) throw new Error('Select a receipt printer in PayMyDine Cashier hardware setup.');
  return preferred.name;
}

function rawScriptPath(baseDir) {
  return path.join(baseDir, 'pmd-raw-printer.ps1');
}

function ensureRawScript(baseDir) {
  fs.mkdirSync(baseDir, { recursive: true });
  const target = rawScriptPath(baseDir);
  if (fs.existsSync(target)) return target;

  const script = String.raw`param(
  [Parameter(Mandatory=$true)][string]$PrinterName,
  [Parameter(Mandatory=$true)][string]$BytesBase64
)
$ErrorActionPreference = 'Stop'
$source = @"
using System;
using System.Runtime.InteropServices;
public class PMDRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", SetLastError=true, ExactSpelling=true)] public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", SetLastError=true, ExactSpelling=true)] public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true, ExactSpelling=true)] public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true, ExactSpelling=true)] public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true, ExactSpelling=true)] public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  public static bool Send(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
    try {
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "PayMyDine Raw Print";
      di.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, di)) return false;
      try {
        if (!StartPagePrinter(hPrinter)) return false;
        try {
          IntPtr unmanaged = Marshal.AllocCoTaskMem(bytes.Length);
          try {
            Marshal.Copy(bytes, 0, unmanaged, bytes.Length);
            int written;
            bool ok = WritePrinter(hPrinter, unmanaged, bytes.Length, out written);
            return ok && written == bytes.Length;
          } finally { Marshal.FreeCoTaskMem(unmanaged); }
        } finally { EndPagePrinter(hPrinter); }
      } finally { EndDocPrinter(hPrinter); }
    } finally { ClosePrinter(hPrinter); }
  }
}
"@
Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
$bytes = [Convert]::FromBase64String($BytesBase64)
if (-not [PMDRawPrinter]::Send($PrinterName, $bytes)) {
  throw "Raw print failed for printer: $PrinterName"
}
Write-Output "OK"
`;

  fs.writeFileSync(target, script, 'utf8');
  return target;
}

function sendRaw(baseDir, printerName, bytes) {
  const targetPrinter = resolvePrinterName(printerName);
  const ps1 = ensureRawScript(baseDir);
  runPowerShell([
    '-File', ps1,
    '-PrinterName', targetPrinter,
    '-BytesBase64', Buffer.from(bytes).toString('base64'),
  ]);
  return targetPrinter;
}

function parseDrawerCommand(command) {
  const raw = String(command || DEFAULT_DRAWER_COMMAND).trim();
  const values = raw.split(',').map((part) => Number(part.trim()));
  if (!values.length || values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error('Invalid cash drawer command.');
  }
  return Buffer.from(values);
}

function testPrint(baseDir, printerName) {
  const text = ['PayMyDine Cashier', 'Printer connection OK', new Date().toLocaleString(), '', ''].join('\r\n');
  const selected = sendRaw(baseDir, printerName, Buffer.from(text, 'ascii'));
  return { ok: true, printerName: selected };
}

function openDrawer(baseDir, printerName, command) {
  const bytes = parseDrawerCommand(command);
  const selected = sendRaw(baseDir, printerName, bytes);
  return {
    ok: true,
    printerName: selected,
    command: String(command || DEFAULT_DRAWER_COMMAND),
    bytes: Array.from(bytes),
  };
}

async function diagnoseDrawer(baseDir, printerName) {
  const attempts = [];
  for (const command of DRAWER_COMMANDS) {
    try {
      attempts.push({ command, ...openDrawer(baseDir, printerName, command) });
    } catch (error) {
      attempts.push({ command, ok: false, error: error.message });
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  return { ok: attempts.some((row) => row.ok), attempts };
}

// The desktop app becomes the single local hardware owner. Retire the old
// scheduled Connector so a cash sale can never be acted on by two processes.
const legacyConnectorRetirement = retireLegacyConnector();

module.exports = {
  DEFAULT_DRAWER_COMMAND,
  DRAWER_COMMANDS,
  legacyConnectorRetirement,
  retireLegacyConnector,
  listPrinters,
  resolvePrinterName,
  testPrint,
  openDrawer,
  diagnoseDrawer,
};
