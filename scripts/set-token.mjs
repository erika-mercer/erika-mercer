#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolveTokenConfig } from '../assets/token-config.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const inputs = args.filter(value => value !== '--dry-run');
if (inputs.length < 2 || inputs.length > 3) {
  console.error('Usage: node scripts/set-token.mjs CONTRACT_ADDRESS TRADING_URL [TICKER] [--dry-run]');
  process.exit(1);
}
const file = new URL('../assets/token.json', import.meta.url);
const previous = JSON.parse(readFileSync(file, 'utf8'));
const proposed = { ...previous, contractAddress: inputs[0].trim(), tradingUrl: inputs[1].trim(), ticker: inputs[2]?.trim() || previous.ticker || null, launchStatus: 'live' };
delete proposed.pumpUrl;
const validated = resolveTokenConfig(proposed);
if (!validated.live) {
  console.error('Invalid Solana address or trading URL. Token configuration was not changed.');
  process.exit(1);
}
proposed.tradingUrl = validated.tradingUrl;
proposed.updatedAt = new Date().toISOString();
if (dryRun) {
  console.log('Configuration validated; no files changed. Platform:', validated.tradingPlatform);
} else {
  const temporary = new URL('../assets/token.json.tmp', import.meta.url);
  writeFileSync(temporary, JSON.stringify(proposed, null, 2) + '\n');
  renameSync(temporary, file);
  console.log('Token configuration updated. Platform:', validated.tradingPlatform);
}
