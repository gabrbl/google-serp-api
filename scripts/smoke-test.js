// Simple smoke test to ensure the app starts and exposes /health
const http = require('http');
const { spawn } = require('child_process');

const proc = spawn(process.execPath, ['index.js'], {
  env: { ...process.env, PORT: '3100' },
  stdio: ['ignore', 'inherit', 'inherit']
});

function done(code) {
  try { proc.kill(); } catch (_) {}
  if (code !== 0) {
    console.error('Smoke test failed');
    process.exit(1);
  } else {
    console.log('Smoke test passed');
    process.exit(0);
  }
}

setTimeout(() => {
  http.get('http://localhost:3100/health', res => {
    if (res.statusCode === 200) {
      done(0);
    } else {
      console.error('Unexpected status code', res.statusCode);
      done(1);
    }
  }).on('error', err => {
    console.error('Request error', err.message);
    done(1);
  });
}, 2500);

setTimeout(() => {
  console.error('Timeout waiting for server');
  done(1);
}, 8000);
