'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAW_RECEIPT_WIDTH_DOTS = 576;
const BLACK_THRESHOLD = 210;

function shouldUseRawRaster(printerInfo) {
  if (process.platform !== 'win32') return false;
  const info = printerInfo || {};
  const identity = `${String(info.name || '')} ${String(info.driver || '')}`.toLowerCase();
  return /generic\s*\/\s*text\s*only|generic.*text.*only|text\s*only/.test(identity);
}

function nativeImageToEscPos(nativeImage, widthDots = RAW_RECEIPT_WIDTH_DOTS) {
  if (!nativeImage || typeof nativeImage.resize !== 'function') {
    throw new Error('Receipt image is unavailable.');
  }

  const source = nativeImage.getSize();
  if (!source || source.width < 1 || source.height < 1) {
    throw new Error('Receipt image is empty.');
  }

  const width = Math.max(8, Math.min(576, Number(widthDots) || RAW_RECEIPT_WIDTH_DOTS));
  const image = nativeImage.resize({ width, quality: 'best' });
  const size = image.getSize();
  const bitmap = image.toBitmap();
  const expected = size.width * size.height * 4;
  if (!bitmap || bitmap.length < expected) {
    throw new Error('Receipt bitmap conversion failed.');
  }

  const widthBytes = Math.ceil(size.width / 8);
  const raster = Buffer.alloc(widthBytes * size.height, 0);

  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const pixel = (y * size.width + x) * 4;
      // Electron/Chromium bitmap on Windows is BGRA. Raw raster is used only
      // for Windows Generic / Text Only queues.
      const blue = bitmap[pixel];
      const green = bitmap[pixel + 1];
      const red = bitmap[pixel + 2];
      const alpha = bitmap[pixel + 3];
      if (alpha < 32) continue;

      const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
      if (luminance < BLACK_THRESHOLD) {
        const byteIndex = (y * widthBytes) + Math.floor(x / 8);
        raster[byteIndex] |= (0x80 >> (x % 8));
      }
    }
  }

  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = size.height & 0xff;
  const yH = (size.height >> 8) & 0xff;

  return {
    bytes: Buffer.concat([
      Buffer.from([0x1b, 0x40]),
      Buffer.from([0x1b, 0x61, 0x01]),
      Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
      raster,
      Buffer.from([0x1b, 0x64, 0x05]),
      Buffer.from([0x1b, 0x61, 0x00]),
    ]),
    width: size.width,
    height: size.height,
    widthBytes,
  };
}

function rawReceiptScriptPath(baseDir) {
  return path.join(baseDir, 'pmd-raw-receipt-printer.ps1');
}

function ensureWindowsRawReceiptScript(baseDir) {
  fs.mkdirSync(baseDir, { recursive: true });
  const target = rawReceiptScriptPath(baseDir);
  if (fs.existsSync(target)) return target;

  const script = String.raw`param(
  [Parameter(Mandatory=$true)][string]$PrinterName,
  [Parameter(Mandatory=$true)][string]$BytesBase64
)
$ErrorActionPreference = 'Stop'
$source = @"
using System;
using System.Runtime.InteropServices;
public class PMDReceiptRawPrinter {
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
      di.pDocName = "PayMyDine Receipt";
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
if (-not [PMDReceiptRawPrinter]::Send($PrinterName, $bytes)) {
  throw "Raw receipt print failed for printer: $PrinterName"
}
Write-Output "OK"
`;

  fs.writeFileSync(target, script, 'utf8');
  return target;
}

function sendRawWindows(baseDir, printerName, bytes) {
  if (process.platform !== 'win32') throw new Error('RAW raster receipt printing is Windows-only in V1.0.2.');
  const ps1 = ensureWindowsRawReceiptScript(baseDir);
  execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', ps1,
    '-PrinterName', printerName,
    '-BytesBase64', Buffer.from(bytes).toString('base64'),
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 20000,
  });
}

function printNativeImage(hardware, baseDir, printerName, nativeImage) {
  if (!hardware || typeof hardware.resolvePrinterName !== 'function') {
    throw new Error('Printer resolver is unavailable.');
  }
  const selected = hardware.resolvePrinterName(printerName);
  const raster = nativeImageToEscPos(nativeImage);
  sendRawWindows(baseDir, selected, raster.bytes);
  return {
    ok: true,
    printerName: selected,
    platform: process.platform,
    mode: 'escpos-raster',
    width: raster.width,
    height: raster.height,
    bytes: raster.bytes.length,
  };
}

module.exports = {
  RAW_RECEIPT_WIDTH_DOTS,
  shouldUseRawRaster,
  nativeImageToEscPos,
  printNativeImage,
};
