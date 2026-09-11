param(
  [string]$PrinterName = 'Generic / Text Only'
)

$ErrorActionPreference = 'Stop'
$mark = 'PMD_CASHIER_PRINTER_DRIVER_TEST_V109'

Write-Host '============================================================'
Write-Host 'PayMyDine Windows printer driver test V1.0.9'
Write-Host '============================================================'

$printer = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $PrinterName } | Select-Object -First 1
if (-not $printer) {
  throw "Windows printer queue not found: $PrinterName"
}

$printer | Select-Object Name, DriverName, PortName, Default, Network, WorkOffline, PrinterStatus | Format-List

Write-Host 'Relevant Windows printer/PnP entries:'
Get-CimInstance Win32_PnPEntity |
  Where-Object {
    $_.Name -match 'printer|receipt|thermal|pos' -or
    $_.PNPDeviceID -match 'USBPRINT'
  } |
  Select-Object Name, Manufacturer, PNPDeviceID |
  Format-Table -AutoSize

Add-Type -AssemblyName System.Drawing
$source = @"
using System;
using System.Drawing;
using System.Drawing.Printing;

public static class PMDWindowsDriverTextPrinterV109Test {
  public static void Print(string printerName, string text) {
    using (PrintDocument doc = new PrintDocument()) {
      doc.PrinterSettings.PrinterName = printerName;
      if (!doc.PrinterSettings.IsValid) {
        throw new InvalidOperationException("Invalid Windows printer queue: " + printerName);
      }

      doc.DocumentName = "PayMyDine Driver Text Test";
      doc.PrintController = new StandardPrintController();
      doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
      try {
        doc.DefaultPageSettings.PaperSize = new PaperSize("PayMyDine 80mm Test", 315, 260);
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

$text = @"
PayMyDine Cashier
DRIVER TEXT TEST V1.0.9
Printer: $PrinterName
This job uses the Windows printer driver.
It does NOT send ESC/POS raster bytes.
$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

[PMDWindowsDriverTextPrinterV109Test]::Print($PrinterName, $text)

Write-Host '============================================================'
Write-Host "$mark=QUEUE_ACCEPTED"
Write-Host 'IMPORTANT: software cannot confirm physical ink/thermal output.'
Write-Host 'Check the printer. The expected paper contains:'
Write-Host 'DRIVER TEXT TEST V1.0.9'
Write-Host '============================================================'
