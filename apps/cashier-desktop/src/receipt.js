'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAW_RECEIPT_WIDTH_DOTS = 576;
const BLACK_THRESHOLD = 210;
const PMD_PRINTER_COMPAT_MARK = 'PMD_CASHIER_PRINTER_COMPAT_V109';

function printerIdentity(printerInfo) {
  const info = printerInfo || {};
  return `${String(info.name || '')} ${String(info.driver || '')}`.toLowerCase();
}

function shouldUseRawRaster(printerInfo) {
  if (process.platform !== 'win32') return false;
  return /generic\s*\/\s*text\s*only|generic.*text.*only|text\s*only/.test(printerIdentity(printerInfo));
}

function shouldUseWindowsDriverText(printerInfo) {
  if (process.platform !== 'win32') return false;
  return /generic\s*\/\s*text\s*only|generic.*text.*only|text\s*only/.test(printerIdentity(printerInfo));
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
  let blackPixels = 0;

  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const pixel = (y * size.width + x) * 4;
      const blue = bitmap[pixel];
      const green = bitmap[pixel + 1];
      const red = bitmap[pixel + 2];
      const alpha = bitmap[pixel + 3];
      if (alpha < 32) continue;

      const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
      if (luminance < BLACK_THRESHOLD) {
        const byteIndex = (y * widthBytes) + Math.floor(x / 8);
        raster[byteIndex] |= (0x80 >> (x % 8));
        blackPixels += 1;
      }
    }
  }

  if (blackPixels < 8) {
    throw new Error('Captured receipt image is blank. Refusing to feed empty paper.');
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
    blackPixels,
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
  if (process.platform !== 'win32') throw new Error('RAW raster receipt printing is Windows-only.');
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

function driverTextScriptPath(baseDir) {
  return path.join(baseDir, 'pmd-windows-driver-text-printer-v109.ps1');
}

function ensureWindowsDriverTextScript(baseDir) {
  fs.mkdirSync(baseDir, { recursive: true });
  const target = driverTextScriptPath(baseDir);
  if (fs.existsSync(target)) return target;

  const script = String.raw`param(
  [Parameter(Mandatory=$true)][string]$PrinterName,
  [Parameter(Mandatory=$true)][string]$TextBase64,
  [Parameter(Mandatory=$true)][int]$PaperWidth,
  [Parameter(Mandatory=$true)][int]$PaperHeight
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = @"
using System;
using System.Drawing;
using System.Drawing.Printing;

public static class PMDWindowsDriverTextPrinterV109 {
  public static void Print(string printerName, string text, int paperWidth, int paperHeight) {
    using (PrintDocument doc = new PrintDocument()) {
      doc.PrinterSettings.PrinterName = printerName;
      if (!doc.PrinterSettings.IsValid) {
        throw new InvalidOperationException("Windows printer queue is invalid: " + printerName);
      }

      doc.DocumentName = "PayMyDine Receipt";
      doc.PrintController = new StandardPrintController();
      doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
      try {
        doc.DefaultPageSettings.PaperSize = new PaperSize("PayMyDine Receipt", paperWidth, paperHeight);
      } catch { }

      string[] lines = (text ?? String.Empty).Replace("\r", String.Empty).Split('\n');
      int lineIndex = 0;
      Font font = new Font("Courier New", 8.0f, FontStyle.Regular, GraphicsUnit.Point);

      doc.PrintPage += delegate(object sender, PrintPageEventArgs e) {
        float y = 1.0f;
        float lineHeight = Math.Max(10.0f, font.GetHeight(e.Graphics) + 1.0f);
        float bottom = Math.Max(lineHeight, e.PageBounds.Height - 2.0f);

        while (lineIndex < lines.Length && y + lineHeight <= bottom) {
          e.Graphics.DrawString(lines[lineIndex], font, Brushes.Black, 1.0f, y);
          y += lineHeight;
          lineIndex += 1;
        }

        e.HasMorePages = lineIndex < lines.Length;
      };

      try {
        doc.Print();
      } finally {
        font.Dispose();
      }
    }
  }
}
"@
Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies System.Drawing.dll -ErrorAction Stop
$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($TextBase64))
[PMDWindowsDriverTextPrinterV109]::Print($PrinterName, $text, $PaperWidth, $PaperHeight)
Write-Output "OK"
`;

  fs.writeFileSync(target, script, 'utf8');
  return target;
}

function paperProfile(rawPaperWidth) {
  const value = String(rawPaperWidth || '').trim().toLowerCase();
  if (value.includes('58')) return { columns: 32, widthHundredths: 228 };
  if (value.includes('112')) return { columns: 64, widthHundredths: 441 };
  if (value.includes('a4')) return { columns: 80, widthHundredths: 827 };
  return { columns: 48, widthHundredths: 315 };
}

function normalizeDriverText(rawText) {
  let value = String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/€/g, ' EUR')
    .replace(/£/g, ' GBP')
    .replace(/¥/g, ' JPY')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

  if (typeof value.normalize === 'function') {
    value = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }

  return value.replace(/[^\x09\x0a\x20-\x7e]/g, '?');
}

function wrapDriverText(rawText, columns) {
  const width = Math.max(24, Math.min(96, Number(columns) || 48));
  const output = [];
  normalizeDriverText(rawText).split('\n').forEach((originalLine) => {
    let line = originalLine.replace(/[ \t]+/g, ' ').trimEnd();
    if (!line) {
      output.push('');
      return;
    }

    while (line.length > width) {
      let cut = line.lastIndexOf(' ', width);
      if (cut < Math.floor(width * 0.55)) cut = width;
      output.push(line.slice(0, cut).trimEnd());
      line = line.slice(cut).trimStart();
    }
    output.push(line);
  });

  while (output.length > 1 && output[output.length - 1] === '') output.pop();
  return output.join('\r\n') + '\r\n';
}

function printWindowsDriverText(hardware, baseDir, printerName, text, rawPaperWidth) {
  if (process.platform !== 'win32') throw new Error('Windows driver text printing is Windows-only.');
  if (!hardware || typeof hardware.resolvePrinterName !== 'function') {
    throw new Error('Printer resolver is unavailable.');
  }

  const selected = hardware.resolvePrinterName(printerName);
  if (typeof hardware.assertPrinterAvailable === 'function') {
    hardware.assertPrinterAvailable(selected);
  }

  const profile = paperProfile(rawPaperWidth);
  const printable = wrapDriverText(text, profile.columns);
  if (!printable.replace(/\s+/g, '')) {
    throw new Error('Receipt text is empty. Refusing to feed blank paper.');
  }

  const lineCount = printable.split(/\r?\n/).length;
  const paperHeight = Math.max(120, Math.min(3000, (lineCount * 14) + 36));
  const ps1 = ensureWindowsDriverTextScript(baseDir);

  execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', ps1,
    '-PrinterName', selected,
    '-TextBase64', Buffer.from(printable, 'utf8').toString('base64'),
    '-PaperWidth', String(profile.widthHundredths),
    '-PaperHeight', String(paperHeight),
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });

  return {
    ok: true,
    printerName: selected,
    platform: process.platform,
    mode: 'windows-driver-text',
    compatibility: PMD_PRINTER_COMPAT_MARK,
    paperWidth: String(rawPaperWidth || '80mm'),
    columns: profile.columns,
    lines: lineCount,
    physicalConfirmed: false,
    message: 'Windows accepted a driver-rendered text receipt. Check the physical printer for paper output.',
  };
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
    blackPixels: raster.blackPixels,
    physicalConfirmed: false,
  };
}

module.exports = {
  RAW_RECEIPT_WIDTH_DOTS,
  PMD_PRINTER_COMPAT_MARK,
  shouldUseRawRaster,
  shouldUseWindowsDriverText,
  nativeImageToEscPos,
  printNativeImage,
  printWindowsDriverText,
  normalizeDriverText,
  wrapDriverText,
};
