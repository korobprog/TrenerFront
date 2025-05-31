const fs = require('fs');
const path = require('path');

// Функция для загрузки переменных окружения из .env.production
function loadEnvFile() {
  const envFiles = ['.env', '.env.production'];
  const envVars = {};

  envFiles.forEach((fileName) => {
    const envPath = path.join(__dirname, fileName);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      lines.forEach((line) => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim().split('#')[0].trim();
          envVars[key.trim()] = value;
        }
      });
    }
  });

  return envVars;
}

const envVars = loadEnvFile();

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
        ...envVars,
      },
      error_file: '/root/supermock/logs/err.log',
      out_file: '/root/supermock/logs/out.log',
      log_file: '/root/supermock/logs/combined.log',
      time: true,
    },
  ],
};
