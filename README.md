# WorkFit

[Open WorkFit](https://workfit.jp2019213506.workers.dev/)

A personal weekly planner for balancing work opportunities with care, rest and other commitments.

## Run

Node.js 22 or later is recommended.

```
npm ci
npm run dev
npm test
npm run build
```

## Storage and privacy

This edition has no registration service, cloud database or model API calls. Each local profile has separate browser storage. Profiles are not password protected. Clearing site data removes saved weeks; use the export and restore controls to keep backups or move between devices. Hosting receives normal web requests, but the application does not send saved plans to a server.

## Planning

Add offers with fixed gross pay, reserve time including travel, and confirm weekly income, maximum hours and rest limits. The planner searches feasible combinations with one shift per day. A chosen plan needs a recorded response; changing inputs invalidates it. Calendar exports are tentative proposals, not employer approvals. Message import reads explicitly formatted shifts locally and requires review; it is not a language model.

## Publish

Upload the contents of `dist` to a static HTTPS host after building. `wrangler.json` supports Cloudflare Workers static assets. No environment variables or credentials are required. Never commit personal backups or `.env` files.
