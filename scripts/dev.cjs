const path = require('node:path');
const { spawn } = require('node:child_process');
const checkDatabase = require('./database.cjs');
const root = path.resolve(__dirname, '..');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
async function start() {
  await checkDatabase();
  for (const [cwd, args] of [
    ['backend', ['src/server.js']],
    ['frontend', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort']],
  ]) {
    const child = spawn(process.execPath, args, { cwd: path.join(root, cwd), stdio: 'inherit' });
    children.push(child);
    child.on('error', error => { console.error(error.message); stop(1); });
    child.on('exit', code => stop(code || 0));
  }
  console.log('MX Facil: http://localhost:5173 | API: http://localhost:3000/api/health');
  console.log('Ctrl+C para detener ambos servicios.');
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
start().catch(error => {
  console.error(`No se pudo iniciar: ${error.code || error.message}`);
  console.error('Revisa backend/.env y ejecuta npm run db:check.');
  process.exitCode = 1;
});
