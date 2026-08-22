module.exports = {
  apps: [
    {
      name: 'paymydine-frontend-v2',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      cwd: __dirname + '/../..',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      time: true,
    },
  ],
}
