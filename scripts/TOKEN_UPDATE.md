# Token update

The public token details live in `assets/token.json`. Until the owner supplies the real Solana mint address and trading page, keep `launchStatus` as `coming-soon`, and both address and URL as `null`.

## Publish the owner's token details

1. Confirm the supplied URL identifies the supplied mint. A DEX pair address may differ from the mint; inspect the pair's token details. Address validation checks encoding, not token identity or liquidity.
2. Run `node scripts/set-token.mjs CA TRADING_URL [TICKER] --dry-run`. Omit the ticker if it has not been supplied.
3. Remove `--dry-run` to write the details. No sample addresses should be published.
4. Run `node scripts/publish-site.mjs --wrangler PATH_TO_INSTALLED_WRANGLER`. The script builds the isolated public bundle, scans it for private data, checks the package, then deploys the existing `erika-club-studio` Worker using the existing local Cloudflare sign-in. The deployment config sits outside the public repository, in its parent directory.
5. Check `https://erikamercer.club/#token`: exact address, Copy contract address, destination link, ticker when provided, status and FAQ. Verify the custom domain still serves the site.
6. Commit only the intended public changes with the repository's Erika author identity, and push using the existing Erika GitHub session.

The page requests fresh token details on entry, when returning to the browser, and every 20 seconds while the Token tab is visible. Token JSON is served with `Cache-Control: no-store`. Existing images and videos are reused by Cloudflare on later uploads.

To remove published details, restore the previous pending configuration and publish again. The page then disables the external link and copy control automatically.

Only public project data belongs in this JSON. No wallet keys, authentication tokens, personal emails, local filesystem paths or unpublished private data.
