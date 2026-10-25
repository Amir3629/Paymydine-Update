/* PMD_INVENTORY_REPORTS_V1: export the current location's stock, no extra API. */
(function () {
  'use strict';
  var button = document.querySelector('[data-pmd-report-inventory-stock-export]');
  var dataNode = document.getElementById('pmd-report-inventory-stock-data');
  if (!button || !dataNode) return;

  function quote(value) {
    var cell = String(value == null ? '' : value);
    // Prevent spreadsheet formula execution in exported item/category text.
    if (/^[\s]*[=+@-]/.test(cell)) cell = "'" + cell;
    return '"' + cell.replace(/"/g, '""') + '"';
  }

  button.addEventListener('click', function () {
    var items = [];
    try { items = JSON.parse(dataNode.textContent || '[]'); } catch (ignore) {}
    if (!Array.isArray(items)) return;
    var rows = [['Item', 'Category', 'On hand', 'Base unit', 'Stock value', 'Status']];
    items.forEach(function (item) {
      rows.push([
        item.name || '', item.category || '', item.on_hand || 0,
        item.unit || '', item.stock_value || 0, item.status || ''
      ]);
    });
    var csv = '\uFEFF' + rows.map(function (row) {
      return row.map(quote).join(',');
    }).join('\r\n') + '\r\n';
    var url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    var link = document.createElement('a');
    link.href = url;
    link.download = 'paymydine-inventory-stock.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
}());
