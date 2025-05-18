module.exports = {
  apps: [
    {
      name: 'supermock',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/root/supermock/logs/err.log',
      out_file: '/root/supermock/logs/out.log',
      log_file: '/root/supermock/logs/combined.log',
      time: true,
    },
  ],
};
