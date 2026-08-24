'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const { execFileSync } = require('child_process');

const VERSION = '1.0.0';
const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, '.env');
const STATE_PATH = path.join(ROOT, 'state.json');
const RAW_PS1 = path.join(ROOT, 'pmd-raw-print.ps1');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(ENV_PATH);

const cfg = {
  backendBase: String(process.env.BACKEND_BASE_URL || '').replace(/\/+$/, ''),
  bootstrapToken: String(process.env.POS_AGENT_TOKEN || '').trim(),
  pairingToken: String(process.env.POS_PAIRING_TOKEN || '').trim(),
  deviceCode: String(process.env.POS_DEVICE_CODE || '').trim(),
  displayName: String(process.env.POS_DISPLAY_NAME || os.hostname() || 'PayMyDine POS').trim(),
  pollMs: Math.max(1000, Number(process.env.POLL_INTERVAL_MS || 2000)),
  localApiEnabled: String(process.env.LOCAL_API_ENABLED || 'true').toLowerCase() !== 'false',
  localApiHost: String(process.env.LOCAL_API_HOST || '127.0.0.1'),
  localApiPort: Number(process.env.LOCAL_API_PORT || 17877),
};

if (!cfg.backendBase) throw new Error('BACKEND_BASE_URL is required');
if (!cfg.deviceCode) throw new Error('POS_DEVICE_CODE is required');

function defaultState() {
  return {
    deviceToken: '',
    deviceId: null,
    pairedAt: null,
    pendingAcks: {},
    executed: {},
    lastPollAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastCommand: null,
  };
}

function readState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return defaultState();
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return Object.assign(defaultState(), parsed && typeof parsed === 'object' ? parsed : {});
  } catch (error) {
    return defaultState();
  }
}

let state = readState();

function saveState() {
  const tmp = STATE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, STATE_PATH);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(method, urlString, token, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const transport = url.protocol === 'https:' ? https : http;
    const payload = body === undefined || body === null ? null : Buffer.from(JSON.stringify(body));
    const headers = Object.assign({
      'Accept': 'application/json',
      'User-Agent': 'PayMyDine-LocalPosAgent/' + VERSION,
    }, extraHeaders || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(payload.length);
    }

    const req = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: url.pathname + url.search,
      method,
      headers,
      timeout: 10000,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = {};
        if (text) {
          try { json = JSON.parse(text); }
          catch (error) { json = { success: false, message: text.slice(0, 500) }; }
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json);
        } else {
          const err = new Error(json.message || ('HTTP ' + res.statusCode));
          err.statusCode = res.statusCode;
          err.response = json;
          reject(err);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function scrubBootstrapSecrets() {
  if (!fs.existsSync(ENV_PATH)) return;
  try {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).map((line) => {
      if (/^POS_AGENT_TOKEN=/.test(line)) return 'POS_AGENT_TOKEN=';
      if (/^POS_PAIRING_TOKEN=/.test(line)) return 'POS_PAIRING_TOKEN=';
      return line;
    });
    fs.writeFileSync(ENV_PATH, lines.join(os.EOL), { encoding: 'utf8', mode: 0o600 });
    cfg.bootstrapToken = '';
    cfg.pairingToken = '';
  } catch (error) {
    console.error('[PMD] Could not scrub bootstrap secrets:', error.message);
  }
}

async function ensurePaired() {
  if (state.deviceToken) return;
  if (!cfg.bootstrapToken || !cfg.pairingToken) {
    throw new Error('Agent is not paired. Re-download the PayMyDine connector from Devices & Hardware.');
  }

  const result = await requestJson(
    'POST',
    cfg.backendBase + '/api/pos-agent/pair',
    cfg.bootstrapToken,
    {
      pairing_token: cfg.pairingToken,
      device_code: cfg.deviceCode,
      display_name: cfg.displayName,
      platform_info: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        release: os.release(),
        agent_version: VERSION,
      },
    }
  );

  if (!result || !result.success || !result.device_token) {
    throw new Error((result && result.message) || 'Pairing failed');
  }

  state.deviceToken = String(result.device_token);
  state.deviceId = result.device && result.device.device_id ? Number(result.device.device_id) : null;
  state.pairedAt = new Date().toISOString();
  state.lastError = null;
  saveState();
  scrubBootstrapSecrets();
  console.log('[PMD] POS paired:', cfg.deviceCode);
}

function ensureRawPrintScript() {
  if (fs.existsSync(RAW_PS1)) return;
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

    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool Send(string printerName, byte[] bytes) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
        try {
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "PayMyDine Raw Command";
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
                    } finally {
                        Marshal.FreeCoTaskMem(unmanaged);
                    }
                } finally {
                    EndPagePrinter(hPrinter);
                }
            } finally {
                EndDocPrinter(hPrinter);
            }
        } finally {
            ClosePrinter(hPrinter);
        }
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
  fs.writeFileSync(RAW_PS1, script, { encoding: 'utf8', mode: 0o600 });
}

function listPrinters() {
  const ps = "$ErrorActionPreference='Stop'; $rows = @(Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PortName,Default,Network,WorkOffline,PrinterStatus); $rows | ConvertTo-Json -Compress";
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
  }).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map((row) => ({
    name: String(row.Name || ''),
    driver: String(row.DriverName || ''),
    port: String(row.PortName || ''),
    default: !!row.Default,
    network: !!row.Network,
    offline: !!row.WorkOffline,
    status: row.PrinterStatus,
  })).filter((row) => row.name);
}

function resolvePrinter(payload) {
  const explicit = String((payload && payload.printer_name) || '').trim();
  if (explicit) return explicit;
  const target = String((payload && payload.resolved_target) || '').trim();
  if (target && !/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(target) && !/^COM\d+$/i.test(target)) return target;
  const printers = listPrinters().filter((row) => !row.offline);
  const preferred = printers.find((row) => row.default) || (printers.length === 1 ? printers[0] : null);
  if (!preferred) {
    throw new Error('No Windows receipt printer is selected. Use Load printers in PayMyDine and choose the receipt printer.');
  }
  return preferred.name;
}

function sendRawToPrinter(printerName, bytes) {
  ensureRawPrintScript();
  execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', RAW_PS1,
    '-PrinterName', printerName,
    '-BytesBase64', Buffer.from(bytes).toString('base64'),
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
  });
}

function parseEscPos(command) {
  const text = String(command || '27,112,0,60,120');
  const values = text.split(',').map((part) => Number(part.trim())).filter((n) => Number.isFinite(n));
  if (!values.length || values.some((n) => n < 0 || n > 255)) {
    throw new Error('Invalid ESC/POS command: ' + text);
  }
  return Buffer.from(values);
}

function sendNetwork(target, bytes) {
  return new Promise((resolve, reject) => {
    const match = String(target || '').match(/^([^:]+):(\d+)$/);
    if (!match) return reject(new Error('Invalid network target: ' + target));
    const socket = net.createConnection({ host: match[1], port: Number(match[2]), timeout: 5000 }, () => {
      socket.write(bytes, (error) => {
        if (error) return reject(error);
        socket.end();
      });
    });
    socket.on('close', () => resolve());
    socket.on('timeout', () => socket.destroy(new Error('Network printer timeout')));
    socket.on('error', reject);
  });
}

async function kickDrawer(payload, commandText) {
  const connectionType = String((payload && payload.connection_type) || 'rj11_printer');
  const bytes = parseEscPos(commandText || (payload && payload.esc_pos_command));
  const networkTarget = String((payload && payload.resolved_target) || '');

  if (connectionType === 'network' && /^.+:\d+$/.test(networkTarget) && !(payload && payload.printer_name)) {
    await sendNetwork(networkTarget, bytes);
    return { transport: 'network', target: networkTarget, bytes: Array.from(bytes) };
  }

  const printerName = resolvePrinter(payload || {});
  sendRawToPrinter(printerName, bytes);
  return { transport: 'windows_raw_printer', printer_name: printerName, bytes: Array.from(bytes) };
}

async function executeCommand(command) {
  const payload = command && command.payload && typeof command.payload === 'object' ? command.payload : {};
  const type = String(command.command_type || '');

  if (type === 'list_printers') {
    return { printers: listPrinters() };
  }

  if (type === 'test_print') {
    const printerName = resolvePrinter(payload);
    const text = String(payload.test_print_text || 'PayMyDine printer test\nPrinter connection OK\n\n\n');
    sendRawToPrinter(printerName, Buffer.from(text, 'utf8'));
    return { printer_name: printerName, printed: true };
  }

  if (type === 'open_drawer' || type === 'test_connection') {
    const result = await kickDrawer(payload);
    return Object.assign({ drawer_kick_sent: true }, result);
  }

  if (type === 'diagnose_drawer') {
    const candidates = Array.isArray(payload.candidate_commands) && payload.candidate_commands.length
      ? payload.candidate_commands
      : [payload.esc_pos_command || '27,112,0,60,120'];
    const attempts = [];
    for (const candidate of candidates) {
      try {
        const result = await kickDrawer(payload, candidate);
        attempts.push({ command: candidate, sent: true, transport: result.transport, printer_name: result.printer_name || null });
        await sleep(700);
      } catch (error) {
        attempts.push({ command: candidate, sent: false, error: error.message });
      }
    }
    return { attempts, printer_name: attempts.find((x) => x.printer_name)?.printer_name || null };
  }

  throw new Error('Unsupported command type: ' + type);
}

async function sendAck(commandId, ack) {
  await requestJson(
    'POST',
    cfg.backendBase + '/api/pos-agent/commands/' + encodeURIComponent(String(commandId)) + '/ack',
    state.deviceToken,
    {
      device_code: cfg.deviceCode,
      status: ack.status,
      message: ack.message || '',
      result: ack.result || {},
    }
  );
}

async function flushPendingAcks() {
  const ids = Object.keys(state.pendingAcks || {});
  for (const id of ids) {
    try {
      await sendAck(id, state.pendingAcks[id]);
      delete state.pendingAcks[id];
      saveState();
    } catch (error) {
      if (error.statusCode === 404) {
        delete state.pendingAcks[id];
        saveState();
        continue;
      }
      throw error;
    }
  }
}

function rememberExecution(id, ack) {
  state.executed[String(id)] = {
    at: new Date().toISOString(),
    status: ack.status,
    message: ack.message,
    result: ack.result,
  };
  state.pendingAcks[String(id)] = ack;
  const keys = Object.keys(state.executed).sort((a, b) => Number(a) - Number(b));
  while (keys.length > 200) delete state.executed[keys.shift()];
  saveState();
}

async function processCommand(command) {
  if (!command || !command.id) return;
  const id = String(command.id);
  if (state.executed[id]) {
    state.pendingAcks[id] = {
      status: state.executed[id].status,
      message: state.executed[id].message,
      result: state.executed[id].result,
    };
    saveState();
    await flushPendingAcks();
    return;
  }

  let ack;
  try {
    const result = await executeCommand(command);
    ack = { status: 'success', message: 'Command executed', result };
    state.lastSuccessAt = new Date().toISOString();
  } catch (error) {
    ack = { status: 'failed', message: error.message || String(error), result: {} };
  }

  state.lastCommand = { id: Number(command.id), type: command.command_type, at: new Date().toISOString(), status: ack.status };
  rememberExecution(id, ack);
  await flushPendingAcks();
}

async function pollOnce() {
  await ensurePaired();
  await flushPendingAcks();
  state.lastPollAt = new Date().toISOString();
  saveState();

  const json = await requestJson(
    'GET',
    cfg.backendBase + '/api/pos-agent/commands/pull?device_code=' + encodeURIComponent(cfg.deviceCode),
    state.deviceToken
  );

  if (json && json.command) await processCommand(json.command);
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '');
  const allowed = origin === '' || /^https:\/\/(?:[a-z0-9-]+\.)*paymydine\.com(?::\d+)?$/i.test(origin) || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true',
    'Vary': 'Origin',
  };
  if (allowed && origin) headers['Access-Control-Allow-Origin'] = origin;
  return { allowed, headers };
}

function startLocalApi() {
  if (!cfg.localApiEnabled) return;
  const server = http.createServer((req, res) => {
    const cors = corsHeaders(req);
    Object.entries(cors.headers).forEach(([key, value]) => res.setHeader(key, value));
    if (req.method === 'OPTIONS') {
      res.statusCode = cors.allowed ? 204 : 403;
      return res.end();
    }
    if (!cors.allowed) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ ok: false, message: 'Origin not allowed' }));
    }

    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method === 'GET' && pathname === '/health') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        ok: true,
        version: VERSION,
        device_code: cfg.deviceCode,
        display_name: cfg.displayName,
        paired: !!state.deviceToken,
        device_id: state.deviceId,
        last_poll_at: state.lastPollAt,
        last_success_at: state.lastSuccessAt,
        last_error: state.lastError,
        last_command: state.lastCommand,
      }));
    }
    if (req.method === 'GET' && pathname === '/identity') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        ok: true,
        device_code: cfg.deviceCode,
        display_name: cfg.displayName,
        paired: !!state.deviceToken,
        device_id: state.deviceId,
      }));
    }
    if (req.method === 'GET' && pathname === '/printers') {
      try {
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, printers: listPrinters() }));
      } catch (error) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ ok: false, message: error.message }));
      }
    }
    res.statusCode = 404;
    return res.end(JSON.stringify({ ok: false, message: 'Not found' }));
  });
  server.listen(cfg.localApiPort, cfg.localApiHost, () => {
    console.log('[PMD] Local API listening on http://' + cfg.localApiHost + ':' + cfg.localApiPort);
  });
  server.on('error', (error) => console.error('[PMD] Local API error:', error.message));
}

async function main() {
  console.log('[PMD] PayMyDine Local POS Agent', VERSION);
  console.log('[PMD] Backend:', cfg.backendBase);
  console.log('[PMD] Device:', cfg.deviceCode);
  startLocalApi();

  for (;;) {
    try {
      await pollOnce();
      state.lastError = null;
      saveState();
    } catch (error) {
      state.lastError = error.message || String(error);
      saveState();
      console.error('[PMD] Poll error:', state.lastError);
      if (error.statusCode === 401 && state.deviceToken) {
        console.error('[PMD] Device credential rejected. Re-download and run the connector to pair again.');
      }
    }
    await sleep(cfg.pollMs);
  }
}

process.on('uncaughtException', (error) => {
  console.error('[PMD] Uncaught exception:', error && error.stack ? error.stack : error);
});
process.on('unhandledRejection', (error) => {
  console.error('[PMD] Unhandled rejection:', error && error.stack ? error.stack : error);
});

main().catch((error) => {
  console.error('[PMD] Fatal:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
