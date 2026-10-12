#!/usr/bin/env node
import { readFileSync, writeFileSync, cpSync, mkdtempSync, existsSync, renameSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = dirname(repository);
const configPath = join(workspace, 'erika-site-wrangler.jsonc');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (config.name !== 'erika-club-studio' || config.assets.directory !== './site-dist') throw new Error('Unexpected deployment target.');
const args = process.argv.slice(2);
const wranglerIndex = args.indexOf('--wrangler');
const wrangler = wranglerIndex >= 0 ? args[wranglerIndex + 1] : process.env.ERIKA_WRANGLER_PATH;
if (!wrangler) throw new Error('Provide the installed Wrangler entry point with --wrangler or ERIKA_WRANGLER_PATH.');

function audit(folder) {
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    const info = lstatSync(path);
    if (info.isSymbolicLink() || entry.startsWith('.')) throw new Error('Unexpected hidden file or symlink in public assets.');
    if (info.isDirectory()) audit(path);
    else {
      const content = readFileSync(path).toString('latin1').toLowerCase();
      const privateText = (process.env.ERIKA_PRIVATE_TEXT || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if (privateText.some(value => content.includes(value)) || /\/users\/|\/var\/folders\/|github_pat_|ghp_|-----begin.*private key|\b(?:api_key|oauth_token|access_token)\s*[:=]\s*["'][^"']+/i.test(content)) throw new Error('Privacy check failed for ' + relative(repository, path));
    }
  }
}
audit(join(repository, 'assets')); audit(join(repository, 'media'));
const html = readFileSync(join(repository, 'club.html'), 'utf8');
if (/\/users\/|\/var\/folders\//i.test(html)) throw new Error('Private path in HTML.');
const output = mkdtempSync(join(workspace, 'site-dist-build-'));
writeFileSync(join(output, 'index.html'), html);
const rootAssets = ['favicon.svg', 'site.css', 'portfolio.css', 'site.js', 'avatar.jpg', 'portrait.jpg', 'city.jpg', 'family.jpg', 'parkour.jpg', 'mountains.jpg', 'cover-v2.png'];
for (const name of rootAssets) cpSync(join(repository, 'assets', name), join(output, 'assets', name), { recursive: true });
for (const name of ['studio', 'posters', 'previews', 'type', 'lookbook', 'studies']) cpSync(join(repository, 'assets', name), join(output, 'assets', name), { recursive: true });
cpSync(join(repository, 'media'), join(output, 'media'), { recursive: true });
audit(output);
const destination = join(workspace, 'site-dist');
if (existsSync(destination)) renameSync(destination, join(workspace, `site-dist-backup-${Date.now()}`));
renameSync(output, destination);
if (args.includes('--build-only')) process.exit(0);
function deploy(dryRun) {
  const command = [wrangler, 'deploy', '--config', configPath];
  if (dryRun) command.push('--dry-run');
  const result = spawnSync(process.execPath, command, { cwd: workspace, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
deploy(true);
if (!args.includes('--dry-run')) deploy(false);
