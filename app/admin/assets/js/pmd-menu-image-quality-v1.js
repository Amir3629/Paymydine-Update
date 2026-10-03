// PMD_MENU_IMAGE_QUALITY_V1
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/menu' && path !== '/admin/pmdmenus') return;

  var modal = document.querySelector('[data-pmd-menu-modal]');
  var form = modal && modal.querySelector('[data-pmd-menu-form]');
  var input = form && form.querySelector('[data-pmd-menu-image-input]');
  if (!form || !input) return;

  var MIN_PIXELS = 900000;
  var MAX_PIXELS = 24000000;
  var MAX_BYTES = 5 * 1024 * 1024;
  var SAMPLE_MAX = 192;
  var OUTPUT_MAX_EDGE = 2200;

  var bypassNextChange = false;
  var checking = false;
  var stagedQuality = [];
  var qualityByKey = new Map();
  var statusNode = null;
  var galleryObserver = null;

  function fileKey(file) {
    return [String(file && file.name || ''), Number(file && file.size || 0), Number(file && file.lastModified || 0), String(file && file.type || '')].join('::');
  }

  function ensureUi() {
    var upload = input.closest('.pmd-menu-form__upload');
    var help = form.querySelector('[data-pmd-gallery-help]');
    if (help) {
      help.hidden = false;
      help.textContent = 'Clear photos only · any shape is OK.';
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
    if (!ctx) throw new Error('canvas');
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
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      satSum += (max - min) / 255;
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

  function classify(file, decoded, stats) {
    var pixels = decoded.width * decoded.height;
    var result = {
      key: fileKey(file),
      file: file,
      width: decoded.width,
      height: decoded.height,
      pixels: pixels,
      state: 'good',
      label: 'Good',
      reason: ''
    };

    if (file.size > MAX_BYTES) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'larger than 5 MB'; return result;
    }
    if (['image/jpeg','image/png','image/webp'].indexOf(String(file.type || '').toLowerCase()) === -1) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'use JPG, PNG or WEBP'; return result;
    }
    if (!decoded.width || !decoded.height || pixels < MIN_PIXELS) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'photo is too small'; return result;
    }
    if (pixels > MAX_PIXELS) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'photo is too large to process'; return result;
    }
    if (stats.contrast < 6) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'not enough visible detail'; return result;
    }
    if (stats.mean < 12 || stats.mean > 244 || stats.darkRatio > 0.94 || stats.brightRatio > 0.94) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'photo is too dark or too bright'; return result;
    }
    if (stats.edge < 1.05 && stats.contrast < 50) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'photo is too blurry'; return result;
    }
    if (stats.saturation < 0.035 && stats.binaryRatio > 0.78 && stats.edge > 20) {
      result.state = 'reject'; result.label = 'Not added'; result.reason = 'use a real food photo, not a QR code or graphic'; return result;
    }

    var warning = pixels < 1500000 || stats.edge < 2.2 || stats.mean < 28 || stats.mean > 230 || stats.contrast < 18;
    if (warning) {
      result.state = 'usable';
      result.label = 'Usable';
      result.reason = 'a clearer photo would look better';
    }

    return result;
  }

  function webpName(name) {
    var base = String(name || 'food-photo').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return (base || 'food-photo') + '.webp';
  }

  function optimizeAcceptedFile(file, decoded) {
    var originalPixels = Math.max(1, decoded.width * decoded.height);
    var edgeScale = Math.min(1, OUTPUT_MAX_EDGE / Math.max(decoded.width, decoded.height));
    var pixelFloorScale = Math.min(1, Math.sqrt(MIN_PIXELS / originalPixels));
    var scale = Math.max(edgeScale, pixelFloorScale);
    scale = Math.min(1, scale);
    var width = Math.max(1, Math.round(decoded.width * scale));
    var height = Math.max(1, Math.round(decoded.height * scale));

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.toBlob !== 'function') return Promise.resolve(file);
    decoded.draw(ctx, width, height);

    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob || !blob.size) { resolve(file); return; }
        try {
          resolve(new File([blob], webpName(file.name), {
            type: 'image/webp',
            lastModified: file.lastModified || Date.now()
          }));
        } catch (error) {
          resolve(file);
        }
      }, 'image/webp', 0.84);
    });
  }

  function analyzeFile(file) {
    if (!file) return Promise.resolve({state:'reject', label:'Not added', reason:'invalid file', file:file, key:''});
    if (file.size > MAX_BYTES) return Promise.resolve({state:'reject', label:'Not added', reason:'larger than 5 MB', file:file, key:fileKey(file)});
    if (['image/jpeg','image/png','image/webp'].indexOf(String(file.type || '').toLowerCase()) === -1) {
      return Promise.resolve({state:'reject', label:'Not added', reason:'use JPG, PNG or WEBP', file:file, key:fileKey(file)});
    }

    return decodeImage(file).then(function (decoded) {
      var stats;
      var result;
      try {
        stats = sampleStats(decoded);
        result = classify(file, decoded, stats);
      } catch (error) {
        decoded.close();
        return {state:'reject', label:'Not added', reason:'image could not be checked', file:file, key:fileKey(file)};
      }

      if (result.state === 'reject') {
        decoded.close();
        return result;
      }

      return optimizeAcceptedFile(file, decoded).then(function (optimizedFile) {
        result.file = optimizedFile;
        result.key = fileKey(optimizedFile);
        return result;
      }).finally(function () {
        decoded.close();
      });
    }).catch(function () {
      return {state:'reject', label:'Not added', reason:'image could not be read', file:file, key:fileKey(file)};
    });
  }

  function replaceInputFiles(files) {
    if (typeof DataTransfer === 'undefined') throw new Error('DataTransfer unavailable');
    var transfer = new DataTransfer();
    files.forEach(function (file) { transfer.items.add(file); });
    input.files = transfer.files;
  }

  function annotateGallery() {
    var host = form.querySelector('[data-pmd-menu-gallery-editor]');
    if (!host) return;
    var items = Array.prototype.slice.call(host.querySelectorAll('.pmd-menu-gallery-editor__item.is-new'));
    if (!items.length) {
      if (!checking && (!input.files || !input.files.length)) {
        stagedQuality = [];
        qualityByKey.clear();
      }
      return;
    }

    items.forEach(function (item, index) {
      var old = item.querySelector('[data-pmd-image-quality-badge]');
      if (old) old.remove();
      var quality = stagedQuality[index];
      if (!quality) return;
      var badge = document.createElement('span');
      badge.setAttribute('data-pmd-image-quality-badge', '');
      badge.className = 'pmd-menu-image-quality__badge is-' + quality.state;
      badge.textContent = quality.label;
      badge.title = quality.reason || quality.label;
      item.appendChild(badge);
    });
  }

  function watchGallery() {
    var host = form.querySelector('[data-pmd-menu-gallery-editor]');
    if (!host || galleryObserver) return;
    galleryObserver = new MutationObserver(function () { annotateGallery(); });
    galleryObserver.observe(host, {childList:true, subtree:true});
    annotateGallery();
  }

  function summarize(results) {
    var accepted = results.filter(function (row) { return row.state !== 'reject'; });
    var rejected = results.filter(function (row) { return row.state === 'reject'; });
    var usable = accepted.filter(function (row) { return row.state === 'usable'; });

    if (rejected.length) {
      var first = rejected[0];
      var prefix = accepted.length ? accepted.length + ' photo' + (accepted.length === 1 ? '' : 's') + ' ready · ' : '';
      return {kind:'error', text:prefix + rejected.length + ' not added: ' + first.reason + (rejected.length > 1 ? ' (+ more)' : '')};
    }
    if (usable.length) return {kind:'warn', text:accepted.length + ' photo' + (accepted.length === 1 ? '' : 's') + ' ready · quality is usable'};
    if (accepted.length) return {kind:'good', text:accepted.length + ' photo' + (accepted.length === 1 ? '' : 's') + ' ready ✓'};
    return {kind:'', text:''};
  }

  document.addEventListener('change', function (event) {
    if (event.target !== input || bypassNextChange) return;
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    event.stopImmediatePropagation();
    event.stopPropagation();
    checking = true;
    setStatus('checking', 'Checking photo quality…');

    Promise.all(files.map(analyzeFile)).then(function (results) {
      var accepted = results.filter(function (row) { return row.state !== 'reject'; });
      var acceptedFiles = accepted.map(function (row) { return row.file; });

      try {
        replaceInputFiles(acceptedFiles);
      } catch (error) {
        input.value = '';
        accepted = [];
        acceptedFiles = [];
        results = [{state:'reject', reason:'this browser could not safely validate the selection'}];
      }

      accepted.forEach(function (row) {
        if (!row.key || qualityByKey.has(row.key)) return;
        qualityByKey.set(row.key, row);
        stagedQuality.push(row);
      });

      var summary = summarize(results);
      setStatus(summary.kind, summary.text);

      bypassNextChange = true;
      input.dispatchEvent(new Event('change', {bubbles:true}));
      bypassNextChange = false;
      checking = false;
      window.requestAnimationFrame(function () {
        watchGallery();
        annotateGallery();
      });
    }).catch(function () {
      input.value = '';
      checking = false;
      setStatus('error', 'Photo could not be checked. Please choose another image.');
    });
  }, true);

  document.addEventListener('click', function (event) {
    var remove = event.target && event.target.closest && event.target.closest('[data-pmd-gallery-remove-new]');
    if (!remove || !form.contains(remove)) return;
    var index = Number(remove.getAttribute('data-pmd-gallery-remove-new'));
    if (!Number.isFinite(index) || index < 0 || index >= stagedQuality.length) return;
    var row = stagedQuality[index];
    stagedQuality.splice(index, 1);
    if (row && row.key) qualityByKey.delete(row.key);
    window.setTimeout(annotateGallery, 0);
  }, true);

  form.addEventListener('submit', function (event) {
    if (!checking) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setStatus('checking', 'Checking photo quality…');
  }, true);

  form.addEventListener('reset', function () {
    stagedQuality = [];
    qualityByKey.clear();
    setStatus('', '');
  });

  ensureUi();
  watchGallery();
})();
