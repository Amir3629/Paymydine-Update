'use strict';

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

let installed = false;

function snapshotMhtmlPath(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'file:') return '';
    const file = fileURLToPath(url);
    if (!file.includes(`${path.sep}platform-snapshots-v130${path.sep}`)) return '';
    return /\.mhtml$/i.test(file) ? file : '';
  } catch (_) {
    return '';
  }
}

async function looksBlank(contents) {
  try {
    return await contents.executeJavaScript(`(function(){
      var body=document.body;
      if(!body) return true;
      var text=String(body.innerText||'').replace(/\\s+/g,' ').trim();
      var meaningful=document.querySelectorAll('main,nav,aside,section,article,table,form,img,svg,canvas,[role="main"],[role="navigation"]').length;
      var children=body.children?body.children.length:0;
      return text.length<12&&meaningful<2&&children<2;
    })()`, true);
  } catch (_) {
    return true;
  }
}

function install() {
  if (installed) return;
  installed = true;

  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-finish-load', () => {
      const mhtml = snapshotMhtmlPath(contents.getURL());
      if (!mhtml) return;

      setTimeout(async () => {
        if (contents.isDestroyed() || snapshotMhtmlPath(contents.getURL()) !== mhtml) return;
        if (!(await looksBlank(contents))) return;

        const fallback = mhtml.replace(/\.mhtml$/i, '.offline.html');
        if (!fs.existsSync(fallback)) return;
        console.warn('[PMD Desktop] cached MHTML rendered blank; using visual fallback.');
        contents.loadFile(fallback).catch(() => {});
      }, 220);
    });
  });
}

module.exports = { install };
