#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const net = require('net');
const path = require('path');
const os = require('os');
const http = require('http');
const { exec, execFile } = require('child_process');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const idx = t.indexOf('=');
    if (idx <= 0) return;
    const key = t.slice(0, idx).trim();
    const value = t.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnv(path.join(__dirname, '.env'));

const BACKEND_BASE_URL = (process.env.BACKEND_BASE_URL || '').replace(/\/+$/, '');
const POS_AGENT_TOKEN = process.env.POS_AGENT_TOKEN || '';
const POS_DEVICE_CODE = process.env.POS_DEVICE_CODE || '';
const POS_PAIRING_TOKEN = process.env.POS_PAIRING_TOKEN || '';
const POS_DISPLAY_NAME = process.env.POS_DISPLAY_NAME || '';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);

const LOCAL_API_ENABLED = (process.env.LOCAL_API_ENABLED || 'true').toLowerCase() !== 'false';
const LOCAL_API_HOST = process.env.LOCAL_API_HOST || '127.0.0.1';
const LOCAL_API_PORT = parseInt(process.env.LOCAL_API_PORT || '17877', 10);
const DEFAULT_DRAWER_TARGET = process.env.DEFAULT_DRAWER_TARGET || '';
const LOCAL_TEST_PRINT_TEXT = process.env.LOCAL_TEST_PRINT_TEXT || 'PayMyDine printer test';

const runtime = {
  startedAt: new Date().toISOString(),
  lastPairAt: null,
  lastPullAt: null,
  lastPullError: null,
  lastAckAt: null,
  lastAckError: null,
  lastLocalCommand: null,
};

if (!BACKEND_BASE_URL || !POS_AGENT_TOKEN || !POS_DEVICE_CODE) {
  console.error('Missing BACKEND_BASE_URL, POS_AGENT_TOKEN, or POS_DEVICE_CODE');
  process.exit(1);
}

function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseEscPos(cmd) {
  const source = (cmd || '27,112,0,60,120').toString();
  if (source.includes(',')) {
    return Buffer.from(source.split(',').map((n) => parseInt(n.trim(), 10)));
  }
  return Buffer.from([27, 112, 0, 60, 120]);
}

function isTcpTarget(target) {
  return /^tcp:\/\//i.test(target) || /^[\w.-]+:\d+$/.test(target);
}

function parseTcpTarget(target) {
  let t = target;
  if (/^tcp:\/\//i.test(t)) t = t.replace(/^tcp:\/\//i, '');
  const idx = t.lastIndexOf(':');
  return { host: t.slice(0, idx), port: parseInt(t.slice(idx + 1), 10) };
}

function writeTcp(target, bytes) {
  return new Promise((resolve, reject) => {
    const { host, port } = parseTcpTarget(target);
    const socket = net.createConnection({ host, port, timeout: 5000 }, () => {
      socket.write(bytes, (err) => {
        if (err) return reject(err);
        socket.end();
        resolve();
      });
    });
    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('TCP timeout'));
    });
  });
}

function writeLocalPath(target, bytes) {
  fs.writeFileSync(target, bytes);
}

function isUsableDevicePath(target) {
  if (!target) return false;
  // Unix/Linux style device path
  if (target.startsWith('/')) return true;
  // Windows explicit device paths / ports / absolute paths
  if (/^(\\\\\\\\\\.\\\\|COM\\d+|LPT\\d+)/i.test(target)) return true;
  if (/^[a-zA-Z]:[\\\\/]/.test(target)) return true;
  return false;
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve((stdout || '').trim());
    });
  });
}

function execFileCommand(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve((stdout || '').trim());
    });
  });
}

function escapeSingleQuoted(s) {
  return (s || '').replace(/'/g, "''");
}

async function getWindowsPrinters() {
  const ps = "powershell -NoProfile -Command \"Get-Printer | Select-Object Name,PortName,DriverName,PrinterStatus | ConvertTo-Json -Depth 3\"";
  const raw = await execCommand(ps);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.map((p) => ({
    name: p.Name,
    port_name: p.PortName,
    driver_name: p.DriverName,
    status: p.PrinterStatus,
  }));
}

async function printTextWindows(printerName, text) {
  const safePrinter = escapeSingleQuoted(printerName);
  const safeText = escapeSingleQuoted(text || LOCAL_TEST_PRINT_TEXT);
  const ps = `powershell -NoProfile -Command \"$msg='${safeText}'; $msg | Out-Printer -Name '${safePrinter}'\"`;
  await execCommand(ps);
}

async function sendRawToWindowsPrinter(printerName, bytes) {
  const tmpDir = os.tmpdir();
  const csPath = path.join(tmpDir, 'PayMyDineRawPrinterHelper.cs');
  const binPath = path.join(tmpDir, `pmd-drawer-${Date.now()}-${Math.random().toString(16).slice(2)}.bin`);
  const psPath = path.join(tmpDir, `pmd-drawer-${Date.now()}-${Math.random().toString(16).slice(2)}.ps1`);

  const csCode = `using System;
using System.Runtime.InteropServices;
public static class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static bool SendBytesToPrinter(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
    var doc = new DOCINFOA { pDocName = "PayMyDine Drawer Pulse", pDataType = "RAW" };
    if (!StartDocPrinter(hPrinter, 1, doc)) { ClosePrinter(hPrinter); return false; }
    if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return false; }
    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
    try {
      Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
      int written = 0;
      bool ok = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written);
      return ok && written == bytes.Length;
    } finally {
      Marshal.FreeCoTaskMem(pUnmanagedBytes);
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
      ClosePrinter(hPrinter);
    }
  }
}`;

  const psScript = `param([string]$PrinterName, [string]$CsPath, [string]$BinPath)
if (-not (Test-Path -LiteralPath $CsPath)) { throw "C# helper file missing: $CsPath" }
if (-not (Test-Path -LiteralPath $BinPath)) { throw "RAW byte file missing: $BinPath" }
if (-not ("RawPrinterHelper" -as [type])) { Add-Type -Path $CsPath }
$bytes = [System.IO.File]::ReadAllBytes($BinPath)
if (-not [RawPrinterHelper]::SendBytesToPrinter($PrinterName, $bytes)) { throw "RAW printer write failed" }`;

  fs.writeFileSync(csPath, csCode, 'utf8');
  fs.writeFileSync(binPath, bytes);
  fs.writeFileSync(psPath, psScript, 'utf8');

  try {
    const stdout = await execFileCommand('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', psPath,
      printerName,
      csPath,
      binPath,
    ]);
    return { stdout };
  } finally {
    try { fs.unlinkSync(binPath); } catch (_) {}
    try { fs.unlinkSync(psPath); } catch (_) {}
  }
}

function inferTcpTargetFromPortName(portName) {
  if (!portName) return null;
  if (/^IP_/i.test(portName)) {
    return `${portName.replace(/^IP_/i, '')}:9100`;
  }
  if (/^[\w.-]+:\d+$/.test(portName)) {
    return portName;
  }
  return null;
}

async function resolveTarget({ target, printerName }) {
  if (target) return target;
  if (DEFAULT_DRAWER_TARGET) return DEFAULT_DRAWER_TARGET;
  if (!printerName || process.platform !== 'win32') return null;

  const printers = await getWindowsPrinters();
  const match = printers.find((p) => p.name === printerName);
  if (!match) return null;
  return inferTcpTargetFromPortName(match.port_name);
}

function bytesToArray(buffer) {
  return Array.from(buffer.values());
}

async function executeDrawerPulse({ target, escPosCommand, printerName, commandType }) {
  const resolvedTarget = await resolveTarget({ target, printerName });
  const escPos = parseEscPos(escPosCommand);
  const baseResult = {
    printer_name: printerName || null,
    command_type: commandType || null,
    esc_pos_command: (escPosCommand || '').toString(),
    parsed_bytes: bytesToArray(escPos),
    byte_length: escPos.length,
  };

  if (process.platform === 'win32' && printerName) {
    const psResult = await sendRawToWindowsPrinter(printerName, escPos);
    return {
      ...baseResult,
      mode: 'windows_raw_printer',
      stdout: psResult?.stdout || '',
      stderr: '',
    };
  }

  if (!resolvedTarget) {
    throw new Error('No resolved target for drawer pulse. Configure drawer target or printer_name.');
  }

  if (isTcpTarget(resolvedTarget)) {
    await writeTcp(resolvedTarget, escPos);
    return {
      ...baseResult,
      mode: 'tcp',
      target: resolvedTarget,
      stdout: '',
      stderr: '',
    };
  }

  if (!isUsableDevicePath(resolvedTarget)) {
    throw new Error(`Invalid non-executable drawer target: ${resolvedTarget}`);
  }

  writeLocalPath(resolvedTarget, escPos);
  return {
    ...baseResult,
    mode: 'local_path',
    target: resolvedTarget,
    stdout: '',
    stderr: '',
  };
}

async function executeHardwareCommand(command) {
  const payload = command.payload || {};

  if (command.command_type === 'list_printers') {
    const printers = process.platform === 'win32' ? await getWindowsPrinters() : [];
    return { mode: 'list_printers', printers, platform: process.platform };
  }

  if (command.command_type === 'test_print') {
    const printerName = payload.printer_name || payload.meta?.printer_name;
    if (!printerName) {
      throw new Error('printer_name is required for test_print command');
    }

    if (process.platform !== 'win32') {
      throw new Error('test_print is supported on Windows only');
    }

    const text = payload.test_print_text || payload.meta?.test_print_text || `${LOCAL_TEST_PRINT_TEXT} - ${new Date().toISOString()}`;
    await printTextWindows(printerName, text);
    return { mode: 'test_print', printer_name: printerName, text };
  }

  if (command.command_type === 'diagnose_drawer') {
    const candidates = Array.isArray(payload.candidate_commands)
      ? payload.candidate_commands
      : ['27,112,0,25,250', '27,112,0,60,120', '27,112,1,60,120', '16,20,1,0,5'];

    const attempted = [];
    let successIndex = null;

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        const result = await executeDrawerPulse({
          target: payload.resolved_target || '',
          escPosCommand: candidate,
          printerName: payload.printer_name || payload.meta?.printer_name || '',
          commandType: command.command_type,
        });
        attempted.push({ index: i, command: candidate, success: true, result });
        successIndex = i;
      } catch (err) {
        attempted.push({ index: i, command: candidate, success: false, error: err.message || 'Unknown error' });
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    return {
      mode: 'drawer_diagnostics',
      printer_name: payload.printer_name || payload.meta?.printer_name || null,
      attempted_commands: attempted,
      success_index: successIndex,
      success: successIndex !== null,
    };
  }

  return executeDrawerPulse({
    target: payload.resolved_target || '',
    escPosCommand: payload.esc_pos_command,
    printerName: payload.printer_name || payload.meta?.printer_name || '',
    commandType: command.command_type,
  });
}

async function pairDeviceIfNeeded() {
  if (!POS_PAIRING_TOKEN) return;

  const url = `${BACKEND_BASE_URL}/api/pos-agent/pair`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${POS_AGENT_TOKEN}`,
    },
    body: JSON.stringify({
      pairing_token: POS_PAIRING_TOKEN,
      device_code: POS_DEVICE_CODE,
      display_name: POS_DISPLAY_NAME,
    }),
  });

  if (!res.ok) {
    const data = await res.text();
    throw new Error(`Pair failed (${res.status}): ${data}`);
  }

  runtime.lastPairAt = new Date().toISOString();
}

async function pullCommand() {
  const url = `${BACKEND_BASE_URL}/api/pos-agent/commands/pull?device_code=${encodeURIComponent(POS_DEVICE_CODE)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${POS_AGENT_TOKEN}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Pull failed: ${res.status}`);
  runtime.lastPullAt = new Date().toISOString();
  runtime.lastPullError = null;
  return data.command || null;
}

async function ackCommand(commandId, status, message, result) {
  const url = `${BACKEND_BASE_URL}/api/pos-agent/commands/${commandId}/ack`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${POS_AGENT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, message, result }),
  });
  if (!res.ok) {
    const data = await res.text();
    throw new Error(`Ack failed (${res.status}): ${data}`);
  }
  runtime.lastAckAt = new Date().toISOString();
  runtime.lastAckError = null;
}

async function handleCommand(command) {
  try {
    if (!['open_drawer', 'test_connection', 'list_printers', 'test_print', 'diagnose_drawer'].includes(command.command_type)) {
      await ackCommand(command.id, 'failed', `Unsupported command type: ${command.command_type}`, {});
      return;
    }

    const result = await executeHardwareCommand(command);
    await ackCommand(command.id, 'success', 'Hardware command executed', result);
    runtime.lastLocalCommand = {
      source: 'queue',
      command_id: command.id,
      command_type: command.command_type,
      status: 'success',
      result,
      at: new Date().toISOString(),
    };
    console.log(`[OK] command=${command.id} type=${command.command_type} target=${result.target || result.printer_name || 'n/a'} mode=${result.mode || 'n/a'} bytes=${result.byte_length || result.bytes || 'n/a'}`);
  } catch (err) {
    runtime.lastLocalCommand = {
      source: 'queue',
      command_id: command.id,
      command_type: command.command_type,
      status: 'failed',
      error: err.message,
      at: new Date().toISOString(),
    };
    try {
      await ackCommand(command.id, 'failed', err.message || 'Execution failed', {});
    } catch (ackErr) {
      runtime.lastAckError = ackErr.message;
    }
    console.error(`[FAIL] command=${command.id} error=${err.message}`);
  }
}

async function loop() {
  while (true) {
    try {
      const command = await pullCommand();
      if (command) {
        await handleCommand(command);
      }
    } catch (err) {
      runtime.lastPullError = err.message;
      console.error(`[POLL ERROR] ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function startLocalApiServer() {
  if (!LOCAL_API_ENABLED) {
    console.log('Local API bridge disabled by LOCAL_API_ENABLED=false');
    return;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${LOCAL_API_HOST}:${LOCAL_API_PORT}`);

      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, {
          success: true,
          agent: {
            device_code: POS_DEVICE_CODE,
            display_name: POS_DISPLAY_NAME,
            hostname: os.hostname(),
            started_at: runtime.startedAt,
            last_pair_at: runtime.lastPairAt,
            last_pull_at: runtime.lastPullAt,
            last_pull_error: runtime.lastPullError,
            last_ack_at: runtime.lastAckAt,
            last_ack_error: runtime.lastAckError,
            last_local_command: runtime.lastLocalCommand,
          },
        });
      }

      if (req.method === 'GET' && url.pathname === '/printers') {
        const printers = process.platform === 'win32' ? await getWindowsPrinters() : [];
        return json(res, 200, {
          success: true,
          printers,
          platform: process.platform,
          note: process.platform === 'win32' ? null : 'Printer enumeration is implemented for Windows only',
        });
      }

      if (req.method === 'POST' && (url.pathname === '/open-drawer' || url.pathname === '/test-drawer')) {
        const body = await readBody(req);
        const result = await executeDrawerPulse({
          target: body.target || body.resolved_target || '',
          escPosCommand: body.esc_pos_command || body.escPosCommand || '27,112,0,60,120',
          printerName: body.printer_name || body.printerName || '',
        });

        runtime.lastLocalCommand = {
          source: 'localhost',
          endpoint: url.pathname,
          status: 'success',
          result,
          at: new Date().toISOString(),
        };

        return json(res, 200, { success: true, result });
      }

      if (req.method === 'POST' && url.pathname === '/test-print') {
        const body = await readBody(req);
        const printerName = body.printer_name || body.printerName;
        if (!printerName) {
          return json(res, 422, { success: false, message: 'printer_name is required' });
        }

        if (process.platform !== 'win32') {
          return json(res, 422, { success: false, message: 'Test print via printer spooler is supported on Windows only' });
        }

        const text = body.text || `${LOCAL_TEST_PRINT_TEXT} - ${new Date().toISOString()}`;
        await printTextWindows(printerName, text);

        runtime.lastLocalCommand = {
          source: 'localhost',
          endpoint: '/test-print',
          status: 'success',
          printer_name: printerName,
          at: new Date().toISOString(),
        };

        return json(res, 200, {
          success: true,
          result: { printer_name: printerName, text },
        });
      }

      return json(res, 404, { success: false, message: 'Endpoint not found' });
    } catch (err) {
      runtime.lastLocalCommand = {
        source: 'localhost',
        status: 'failed',
        error: err.message,
        at: new Date().toISOString(),
      };
      return json(res, 500, { success: false, message: err.message || 'Local API error' });
    }
  });

  server.listen(LOCAL_API_PORT, LOCAL_API_HOST, () => {
    console.log(`Local API bridge listening at http://${LOCAL_API_HOST}:${LOCAL_API_PORT}`);
  });
}

console.log(`Starting PayMyDine local POS agent for device_code=${POS_DEVICE_CODE}`);
startLocalApiServer();

(async () => {
  try {
    await pairDeviceIfNeeded();
  } catch (err) {
    runtime.lastPullError = `[pair] ${err.message}`;
    console.error(`[PAIR ERROR] ${err.message}`);
  }
  await loop();
})();
