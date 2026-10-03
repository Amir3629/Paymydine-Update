// PMD_MENU_IMAGE_QUALITY_V3_NON_BLOCKING
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/menu' && path !== '/admin/pmdmenus') return;

  var modal = document.querySelector('[data-pmd-menu-modal]');
  var form = modal && modal.querySelector('[data-pmd-menu-form]');
  var input = form && form.querySelector('[data-pmd-menu-image-input]');
  if (!form || !input) return;

  var MIN_PIXELS = 900000;
  var SAMPLE_MAX = 128;
  var statusNode = null;
  var assessmentRun = 0;

  function ensureUi() {
    var upload = input.closest('.pmd-menu-form__upload');
    var help = form.querySelector('[data-pmd-gallery-help]');

    if (help) {
      help.hidden = false;
      help.textContent = 'Any photo shape works.';
      help.setAttribute('data-pmd-image-quality-help', '');
    }

    if (!statusNode) {
      statusNode = document.createElement('div');
      statusNode.className = 'pmd-menu-image-quality';
      statusNode.setAttribute('data-pmd-menu-image-quality-status', '');
      statusNode.hidden = true;
      if (upload) upload.insertAdjacentElement('afterend', statusNode);
      else input.insertAdjacentElement('afterend', statusNode);
    }
  }

  function setStatus(kind, text) {
    ensureUi();
    if (!statusNode) return;
    statusNode.hidden = !text;
    statusNode.className = 'pmd-menu-image-quality' + (kind ? ' is-' + kind : '');
    statusNode.textContent = text || '';
  }

  function decodeImage(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file).then(function (bitmap) {
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw: function (ctx, width, height) { ctx.drawImage(bitmap, 0, 0, width, height); },
          close: function () { try { bitmap.close(); } catch (error) {} }
        };
      });
    }

    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        resolve({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          draw: function (ctx, width, height) { ctx.drawImage(image, 0, 0, width, height); },
          close: function () { URL.revokeObjectURL(url); }
        });
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('decode'));
      };
      image.src = url;
    });
  }

  function sampleStats(decoded) {
    var scale = Math.min(1, SAMPLE_MAX / Math.max(decoded.width, decoded.height));
    var width = Math.max(8, Math.round(decoded.width * scale));
    var height = Math.max(8, Math.round(decoded.height * scale));
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', {willReadFrequently:true});
    if (!ctx) return null;

    decoded.draw(ctx, width, height);
    var pixels = ctx.getImageData(0, 0, width, height).data;
    var count = width * height;
    var gray = new Float32Array(count);
    var sum = 0;
    var sumSq = 0;
    var dark = 0;
    var bright = 0;
    var binary = 0;
    var satSum = 0;

    for (var i = 0, p = 0; i < pixels.length; i += 4, p++) {
      var r = pixels[i];
      var g = pixels[i + 1];
      var b = pixels[i + 2];
      var lum = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
      gray[p] = lum;
      sum += lum;
      sumSq += lum * lum;
      if (lum < 10) dark++;
      if (lum > 245) bright++;
      if (lum < 35 || lum > 220) binary++;
      satSum += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    }

    var mean = count ? sum / count : 0;
    var variance = count ? Math.max(0, (sumSq / count) - (mean * mean)) : 0;
    var contrast = Math.sqrt(variance);
    var edgeSum = 0;
    var edgeCount = 0;

    for (var y = 1; y < height - 1; y++) {
      for (var x = 1; x < width - 1; x++) {
        var idx = (y * width) + x;
        var lap = (4 * gray[idx]) - gray[idx - 1] - gray[idx + 1] - gray[idx - width] - gray[idx + width];
        edgeSum += Math.abs(lap);
        edgeCount++;
      }
    }

    return {
      mean: mean,
      contrast: contrast,
      edge: edgeCount ? edgeSum / edgeCount : 0,
      darkRatio: count ? dark / count : 0,
      brightRatio: count ? bright / count : 0,
      binaryRatio: count ? binary / count : 0,
      saturation: count ? satSum / count : 0
    };
  }

  function assess(file) {
    if (!file) return Promise.resolve({warning:true});

    return decodeImage(file).then(function (decoded) {
      try {
        var pixels = decoded.width * decoded.height;
        var stats = sampleStats(decoded);
        var warning = pixels < MIN_PIXELS;

        if (stats) {
          if (stats.contrast < 6) warning = true;
          if (stats.mean < 12 || stats.mean > 244 || stats.darkRatio > 0.94 || stats.brightRatio > 0.94) warning = true;
          if (stats.edge < 1.05 && stats.contrast < 50) warning = true;
          if (stats.saturation < 0.035 && stats.binaryRatio > 0.78 && stats.edge > 20) warning = true;
          if (pixels < 1500000 || stats.edge < 2.2 || stats.mean < 28 || stats.mean > 230 || stats.contrast < 18) warning = true;
        }

        return {warning:warning};
      } catch (error) {
        return {warning:true};
      } finally {
        decoded.close();
      }
    }).catch(function () {
      return {warning:true};
    });
  }

  document.addEventListener('change', function (event) {
    if (event.target !== input) return;

    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    var run = ++assessmentRun;
    setStatus('checking', 'Checking photo…');

    Promise.all(files.map(assess)).then(function (results) {
      if (run !== assessmentRun) return;
      var warning = results.some(function (row) { return row && row.warning; });
      if (warning) {
        setStatus('warn', files.length === 1 ? 'Photo added · quality could be better.' : 'Photos added · some could look better.');
      } else {
        setStatus('good', files.length === 1 ? 'Photo added ✓' : 'Photos added ✓');
      }
    }).catch(function () {
      if (run !== assessmentRun) return;
      setStatus('warn', files.length === 1 ? 'Photo added · quality could be better.' : 'Photos added · some could look better.');
    });
  }, true);

  form.addEventListener('reset', function () {
    assessmentRun++;
    setStatus('', '');
  });

  ensureUi();
})();
