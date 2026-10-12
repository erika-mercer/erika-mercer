const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// This checks address encoding only; token identity is checked before publication.
export function isSolanaAddress(value) {
  if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  let number = 0n;
  for (const character of value) number = number * 58n + BigInt(alphabet.indexOf(character));
  let bytes = 0;
  for (let remaining = number; remaining > 0n; remaining >>= 8n) bytes++;
  return bytes + (value.match(/^1*/)[0].length) === 32;
}

export function resolveTokenConfig(config = {}) {
  const candidate = typeof config.contractAddress === 'string' ? config.contractAddress.trim() : '';
  const contractAddress = isSolanaAddress(candidate) ? candidate : null;
  const ticker = typeof config.ticker === 'string' ? config.ticker.trim().slice(0, 20) : null;
  let tradingUrl = null;
  let tradingPlatform = null;
  if (contractAddress) {
    try {
      const url = new URL(config.tradingUrl || config.pumpUrl);
      const host = url.hostname.replace(/^www\./, '');
      const platforms = { 'pump.fun': 'Pump.fun', 'dexscreener.com': 'DEX Screener', 'birdeye.so': 'Birdeye', 'raydium.io': 'Raydium', 'jup.ag': 'Jupiter', 'meteora.ag': 'Meteora' };
      if (url.protocol === 'https:' && !url.username && !url.password && !url.port && platforms[host]) {
        const parts = url.pathname.split('/').filter(Boolean);
        const matchingPumpToken = host !== 'pump.fun' || parts.at(-1) === contractAddress;
        const matchingDexNetwork = host !== 'dexscreener.com' || (parts.length === 2 && parts[0] === 'solana' && isSolanaAddress(parts[1]));
        if (matchingPumpToken && matchingDexNetwork && !Array.from(url.searchParams.keys()).some(key => /secret|password|api.?key|auth|access.?token/i.test(key))) {
          tradingUrl = url.href;
          tradingPlatform = platforms[host];
        }
      }
    } catch { /* The pending page has no trading URL. */ }
  }
  return { contractAddress, ticker, tradingUrl, tradingPlatform, live: config.launchStatus === 'live' && Boolean(contractAddress && tradingUrl) };
}
