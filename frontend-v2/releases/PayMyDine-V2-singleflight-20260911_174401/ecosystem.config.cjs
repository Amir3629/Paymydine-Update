module.exports = {
  apps: [{
    name: 'paymydine-frontend-v2',
    cwd: __dirname,
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3002',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '650M',
    env: {
      NODE_ENV: 'production',
      PORT: '3002',
      PMD_BACKEND_ORIGIN: 'http://127.0.0.1:8000',
      PMD_TENANT_HOST_OVERRIDE: 'mimoza.paymydine.com',
      PMD_TRUST_TENANT_OVERRIDE_HEADER: 'false',
      PMD_ALLOW_MOCK_FALLBACK: 'false',
      PMD_ENABLE_THEME_PREVIEW: 'false'
    }
  }]
}
