#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const net = require('net');
const path = require('path');

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

if (!BACKEND_BASE_URL || !POS_AGENT_TOKEN || !POS_DEVICE_CODE) {
  console.error('Missing BACKEND_BASE_URL, POS_AGENT_TOKEN, or POS_DEVICE_CODE');
  process.exit(1);
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

async function executeHardwareCommand(command) {
  const payload = command.payload || {};
  const target = payload.resolved_target || '';
  const escPos = parseEscPos(payload.esc_pos_command);

  if (!target) {
    throw new Error('No resolved_target provided');
  }

  if (isTcpTarget(target)) {
    await writeTcp(target, escPos);
    return { mode: 'tcp', target };
  }

  writeLocalPath(target, escPos);
  return { mode: 'local_path', target };
}

async function pullCommand() {
  const url = `${BACKEND_BASE_URL}/api/pos-agent/commands/pull?device_code=${encodeURIComponent(POS_DEVICE_CODE)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${POS_AGENT_TOKEN}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Pull failed: ${res.status}`);
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
}

async function handleCommand(command) {
  try {
    if (!['open_drawer', 'test_connection'].includes(command.command_type)) {
      await ackCommand(command.id, 'failed', `Unsupported command type: ${command.command_type}`, {});
      return;
    }

    const result = await executeHardwareCommand(command);
    await ackCommand(command.id, 'success', 'Hardware command executed', result);
    console.log(`[OK] command=${command.id} type=${command.command_type} target=${result.target}`);
  } catch (err) {
    await ackCommand(command.id, 'failed', err.message || 'Execution failed', {});
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
      console.error(`[POLL ERROR] ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

console.log(`Starting PayMyDine local POS agent for device_code=${POS_DEVICE_CODE}`);
(async () => {
  try {
    await pairDeviceIfNeeded();
  } catch (err) {
    console.error(`[PAIR ERROR] ${err.message}`);
  }
  await loop();
})();
