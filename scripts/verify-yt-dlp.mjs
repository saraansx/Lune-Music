import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const binaryName = isWin ? 'yt-dlp.exe' : (isMac ? 'yt-dlp_macos' : 'yt-dlp');
const binaryPath = join(root, 'node_modules', 'yt-dlp-exec', 'bin', isWin ? 'yt-dlp.exe' : 'yt-dlp');

async function main() {
  let version;
  try {
    version = execSync(`"${binaryPath}" --version`, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch {
    console.log('[verify-yt-dlp] Binary not found — skipping (yt-dlp-exec postinstall may not have run yet)');
    return;
  }

  console.log(`[verify-yt-dlp] Checking yt-dlp ${version} on ${process.platform} against official checksums...`);

  const shaRes = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/SHA2-256SUMS`);
  if (!shaRes.ok) {
    console.warn(`[verify-yt-dlp] Could not fetch checksums (HTTP ${shaRes.status}) — skipping`);
    return;
  }

  const shaText = await shaRes.text();
  const expectedHash = shaText
    .split('\n')
    .find(line => {
      const trimmed = line.trim();
      return trimmed.endsWith(binaryName) || (isMac && trimmed.endsWith('yt-dlp_macos')) || (!isWin && trimmed.endsWith('yt-dlp'));
    })
    ?.split(/\s+/)[0]
    ?.toLowerCase();

  if (!expectedHash) {
    console.warn(`[verify-yt-dlp] Could not find ${binaryName} entry in checksums — skipping`);
    return;
  }

  const buf = await readFile(binaryPath);
  const actualHash = createHash('sha256').update(buf).digest('hex').toLowerCase();

  if (actualHash !== expectedHash) {
    console.error(`[verify-yt-dlp] HASH MISMATCH! Expected ${expectedHash}, got ${actualHash}`);
    console.log('[verify-yt-dlp] Re-downloading from official source...');

    const downloadFileName = isWin ? 'yt-dlp.exe' : (isMac ? 'yt-dlp_macos' : 'yt-dlp');
    const dlRes = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${downloadFileName}`);
    if (!dlRes.ok) throw new Error(`Download failed: HTTP ${dlRes.status}`);

    const dlBuf = Buffer.from(await dlRes.arrayBuffer());
    const dlHash = createHash('sha256').update(dlBuf).digest('hex').toLowerCase();

    if (dlHash !== expectedHash) {
      throw new Error(`Re-downloaded binary also fails hash check! Expected ${expectedHash}, got ${dlHash}`);
    }

    await writeFile(binaryPath, dlBuf);
    if (!isWin) {
      try {
        await chmod(binaryPath, 0o755);
      } catch {}
    }
    console.log('[verify-yt-dlp] Re-downloaded and verified successfully');
  } else {
    console.log('[verify-yt-dlp] OK — hash matches official release');
  }
}

main().catch(err => {
  console.error('[verify-yt-dlp] FAILED:', err.message);
  process.exit(1);
});

