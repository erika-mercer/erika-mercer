#!/usr/bin/env node
import { readFileSync, writeFileSync, cpSync, mkdirSync, readdirSync, lstatSync } from 'node:fs';
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
      const excludedName = String.fromCharCode(107, 105, 114, 105, 108, 108);
      if (content.includes(excludedName) || /\/users\/|\/var\/folders\/|github_pat_|ghp_|-----begin.*private key|\b(?:api_key|oauth_token|access_token)\s*[:=]\s*["'][^"']+/i.test(content)) throw new Error('Privacy check failed for ' + relative(repository, path));
    }
  }
}
audit(join(repository, 'assets')); audit(join(repository, 'media'));
const html = readFileSync(join(repository, 'club.html'), 'utf8');
if (/\/users\/|\/var\/folders\//i.test(html)) throw new Error('Private path in HTML.');
const output = join(workspace, 'site-dist');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'index.html'), html);
cpSync(join(repository, 'assets'), join(output, 'assets'), { recursive: true });
cpSync(join(repository, 'media'), join(output, 'media'), { recursive: true });
audit(output);
if (readdirSync(output).some(name => !['index.html', 'assets', 'media', '_headers'].includes(name))) throw new Error('Unexpected file in deployment bundle.');
writeFileSync(join(output, '_headers'), '/assets/token.json\n  Cache-Control: no-store\n');
function deploy(dryRun) {
  const command = [wrangler, 'deploy', '--config', configPath];
  if (dryRun) command.push('--dry-run');
  const result = spawnSync(process.execPath, command, { cwd: workspace, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
deploy(true);
if (!args.includes('--dry-run')) deploy(false);
