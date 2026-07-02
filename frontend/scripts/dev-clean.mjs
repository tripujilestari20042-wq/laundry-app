/**
 * Bebaskan port, hapus cache .next, lalu jalankan next dev.
 * URUTAN PENTING: hentikan server dulu, baru hapus cache.
 */
import { execSync, spawn } from 'child_process';
import fs from 'fs';

const PORT = 3000;
const EXTRA_PORTS = [3001];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function killPortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const match = line.trim().match(/LISTENING\s+(\d+)\s*$/);
      if (match) pids.add(match[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`✓ Proses ${pid} di port ${port} dihentikan`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    console.log(`✓ Port ${port} sudah kosong`);
  }
}

function cleanNextCache() {
  for (const dir of ['.next', 'node_modules/.cache']) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✓ ${dir} dihapus`);
    } catch {
      /* belum ada */
    }
  }
}

// 1. Hentikan server lama DULU
if (process.platform === 'win32') {
  killPortWindows(PORT);
  for (const p of EXTRA_PORTS) killPortWindows(p);
} else {
  try {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore', shell: true });
  } catch {
    /* ignore */
  }
}

await sleep(1500);

// 2. Baru hapus cache
cleanNextCache();

console.log(`\n🚀 Menjalankan Next.js di http://localhost:${PORT}\n`);

const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

child.on('exit', (code) => process.exit(code ?? 0));
