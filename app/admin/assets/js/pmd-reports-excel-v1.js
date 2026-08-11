(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-report-page]');
  if (!root) return;

  var button = root.querySelector('[data-pmd-report-export]');
  if (!button) return;

  var VERSION = '1.0.0-native-xlsx';
  var downloadCount = 0;
  var lastFilename = null;

  button.setAttribute('aria-label', 'Download this report as Excel');
  button.setAttribute('title', 'Download Excel');
  button.dataset.pmdReportExportFormat = 'xlsx';
  button.dataset.pmdExcelReady = '1';

  function parseJsonNode(id) {
    var node = document.getElementById(id);
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || '{}');
    } catch (error) {
      return null;
    }
  }

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/\u0000/g, '')
      .replace(/\r\n?/g, '\n');
  }

  function xmlEscape(value) {
    return cleanText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function utf8(value) {
    return new TextEncoder().encode(String(value));
  }

  function concatBytes(parts) {
    var total = parts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var out = new Uint8Array(total);
    var offset = 0;
    parts.forEach(function (part) {
      out.set(part, offset);
      offset += part.length;
    });
    return out;
  }

  var crcTable = null;
  function ensureCrcTable() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c >>> 0;
    }
    return crcTable;
  }

  function crc32(bytes) {
    var table = ensureCrcTable();
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(date) {
    var year = Math.max(1980, date.getFullYear());
    return {
      time: ((date.getHours() & 31) << 11) |
        ((date.getMinutes() & 63) << 5) |
        ((Math.floor(date.getSeconds() / 2)) & 31),
      date: (((year - 1980) & 127) << 9) |
        (((date.getMonth() + 1) & 15) << 5) |
        (date.getDate() & 31)
    };
  }

  function zipStored(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var stamp = dosDateTime(new Date());

    files.forEach(function (file) {
      var name = utf8(file.name);
      var data = file.data instanceof Uint8Array ? file.data : utf8(file.data);
      var crc = crc32(data);
      var flags = 0x0800;

      var local = new Uint8Array(30 + name.length);
      var lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, flags, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, stamp.time, true);
      lv.setUint16(12, stamp.date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true);
      lv.setUint16(28, 0, true);
      local.set(name, 30);

      localParts.push(local, data);

      var central = new Uint8Array(46 + name.length);
      var cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, flags, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, stamp.time, true);
      cv.setUint16(14, stamp.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      central.set(name, 46);
      centralParts.push(central);

      offset += local.length + data.length;
    });

    var centralDirectory = concatBytes(centralParts);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralDirectory.length, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return concatBytes(localParts.concat([centralDirectory, end]));
  }

  function columnName(index) {
    var value = index + 1;
    var name = '';
    while (value > 0) {
      var rem = (value - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function cell(ref, value, style) {
    return '<c r="' + ref + '" t="inlineStr" s="' + style + '"><is><t xml:space="preserve">' +
      xmlEscape(value) +
      '</t></is></c>';
  }

  function rowXml(rowNumber, values, styles, height) {
    var attrs = height ? ' ht="' + height + '" customHeight="1"' : '';
    var cells = values.map(function (value, index) {
      return cell(columnName(index) + rowNumber, value, styles[index] == null ? 3 : styles[index]);
    }).join('');
    return '<row r="' + rowNumber + '"' + attrs + '>' + cells + '</row>';
  }

  function reportMeta(tableData) {
    var source = root.querySelector('.pmd-report-source__copy span');
    var sourceMeta = root.querySelectorAll('.pmd-report-source-meta span');
    var activePeriod = root.querySelector('.pmd-report-periods a.is-active');
    var headerTitle = root.querySelector('.pmd-report-header h1');

    return {
      title: cleanText(tableData.title || (headerTitle ? headerTitle.textContent : 'Owner report')).trim(),
      period: cleanText(sourceMeta[2] ? sourceMeta[2].textContent : (activePeriod ? activePeriod.textContent : '')).trim(),
      timezone: cleanText(sourceMeta[1] ? sourceMeta[1].textContent : '').trim(),
      currency: cleanText(sourceMeta[0] ? sourceMeta[0].textContent : root.getAttribute('data-pmd-report-currency') || 'EUR').trim(),
      source: cleanText(source ? source.textContent : 'Dashboard2 canonical analytics source.').trim(),
      type: cleanText(tableData.type || root.getAttribute('data-pmd-report-type') || 'report').trim()
    };
  }

  function buildWorksheet(tableData) {
    var columns = Array.isArray(tableData.columns) ? tableData.columns : [];
    var rows = Array.isArray(tableData.rows) ? tableData.rows : [];
    var meta = reportMeta(tableData);
    var maxColumns = Math.max(2, columns.length || 1);
    var lastColumn = columnName(maxColumns - 1);
    var sheetRows = [];
    var rowNumber = 1;

    var titleValues = new Array(maxColumns).fill('');
    titleValues[0] = meta.title;
    sheetRows.push(rowXml(rowNumber++, titleValues, titleValues.map(function (_, i) { return i === 0 ? 1 : 0; }), 24));

    [
      ['Period', meta.period || '—'],
      ['Timezone', meta.timezone || '—'],
      ['Currency', meta.currency || '—'],
      ['Generated', new Date().toISOString()],
      ['Data authority', meta.source || '—']
    ].forEach(function (pair) {
      var values = new Array(maxColumns).fill('');
      values[0] = pair[0];
      values[1] = pair[1];
      var styles = new Array(maxColumns).fill(3);
      styles[0] = 2;
      sheetRows.push(rowXml(rowNumber++, values, styles));
    });

    sheetRows.push('<row r="' + rowNumber++ + '"></row>');
    var headerRow = rowNumber;

    if (columns.length) {
      var headers = columns.map(function (column) { return column.label || column.key || ''; });
      sheetRows.push(rowXml(rowNumber++, headers, headers.map(function () { return 2; }), 22));

      rows.forEach(function (dataRow) {
        var values = columns.map(function (column) {
          return dataRow && column ? dataRow[column.key] : '';
        });
        sheetRows.push(rowXml(rowNumber++, values, values.map(function () { return 3; })));
      });
    } else {
      sheetRows.push(rowXml(rowNumber++, ['No matching report rows'], [3]));
    }

    var lastRow = rowNumber - 1;
    var widths = [];
    for (var c = 0; c < maxColumns; c++) {
      var maxLength = c === 0 ? 14 : 12;
      if (columns[c]) maxLength = Math.max(maxLength, cleanText(columns[c].label || columns[c].key || '').length);
      rows.forEach(function (dataRow) {
        if (!columns[c]) return;
        maxLength = Math.max(maxLength, cleanText(dataRow && dataRow[columns[c].key]).length);
      });
      if (c === 1) maxLength = Math.max(maxLength, meta.source.length > 0 ? Math.min(meta.source.length, 58) : 12);
      widths.push(Math.min(60, Math.max(12, maxLength + 2)));
    }

    var colsXml = '<cols>' + widths.map(function (width, index) {
      return '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + width + '" customWidth="1"/>';
    }).join('') + '</cols>';

    var filterXml = columns.length
      ? '<autoFilter ref="A' + headerRow + ':' + columnName(columns.length - 1) + lastRow + '"/>'
      : '';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<dimension ref="A1:' + lastColumn + lastRow + '"/>' +
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + headerRow + '" topLeftCell="A' + (headerRow + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="15"/>' +
        colsXml +
        '<sheetData>' + sheetRows.join('') + '</sheetData>' +
        '<mergeCells count="1"><mergeCell ref="A1:' + lastColumn + '1"/></mergeCells>' +
        filterXml +
      '</worksheet>';
  }

  function buildXlsx(tableData) {
    var worksheet = buildWorksheet(tableData);
    var files = [
      {
        name: '[Content_Types].xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          '</Types>'
      },
      {
        name: '_rels/.rels',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'xl/workbook.xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>' +
          '</workbook>'
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'xl/styles.xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<fonts count="2">' +
              '<font><sz val="11"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' +
              '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' +
            '</fonts>' +
            '<fills count="3">' +
              '<fill><patternFill patternType="none"/></fill>' +
              '<fill><patternFill patternType="gray125"/></fill>' +
              '<fill><patternFill patternType="solid"><fgColor rgb="FF07805F"/><bgColor indexed="64"/></patternFill></fill>' +
            '</fills>' +
            '<borders count="2">' +
              '<border><left/><right/><top/><bottom/><diagonal/></border>' +
              '<border><left style="thin"><color rgb="FFDDE8E5"/></left><right style="thin"><color rgb="FFDDE8E5"/></right><top style="thin"><color rgb="FFDDE8E5"/></top><bottom style="thin"><color rgb="FFDDE8E5"/></bottom><diagonal/></border>' +
            '</borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
            '<cellXfs count="4">' +
              '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
              '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
              '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
              '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
            '</cellXfs>' +
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '<dxfs count="0"/>' +
            '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
          '</styleSheet>'
      },
      {name: 'xl/worksheets/sheet1.xml', data: worksheet}
    ];

    return zipStored(files);
  }

  function safeSlug(value) {
    var slug = cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'report';
  }

  function downloadExcel() {
    var tableData = parseJsonNode('pmd-report-table-data') || {columns: [], rows: []};
    var meta = reportMeta(tableData);
    var periodSlug = safeSlug(meta.period || new URL(window.location.href).searchParams.get('period') || 'current');
    var bytes = buildXlsx(tableData);
    var blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    var filename = 'paymydine-' + safeSlug(meta.type) + '-' + periodSlug + '-' + new Date().toISOString().slice(0, 10) + '.xlsx';

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);

    downloadCount++;
    lastFilename = filename;
  }

  button.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    downloadExcel();
  }, true);

  if (window.PMDOwnerReportsV1) {
    window.PMDOwnerReportsV1.exportExcel = downloadExcel;
  }

  function audit() {
    var tableData = parseJsonNode('pmd-report-table-data') || {columns: [], rows: []};
    return {
      version: VERSION,
      buttonPresent: !!button,
      format: button.dataset.pmdReportExportFormat || null,
      ready: button.dataset.pmdExcelReady === '1',
      columns: Array.isArray(tableData.columns) ? tableData.columns.length : 0,
      rows: Array.isArray(tableData.rows) ? tableData.rows.length : 0,
      downloads: downloadCount,
      lastFilename: lastFilename,
      noServerRequestRequired: true,
      ok: !!button &&
        button.dataset.pmdExcelReady === '1' &&
        button.dataset.pmdReportExportFormat === 'xlsx' &&
        typeof TextEncoder === 'function' &&
        typeof Blob === 'function' &&
        !!window.URL &&
        typeof window.URL.createObjectURL === 'function'
    };
  }

  window.PMDOwnerReportExcelV1 = {
    version: VERSION,
    download: downloadExcel,
    audit: audit
  };

  console.info('[PMD Owner Report Excel V1] Ready', audit());
})();
