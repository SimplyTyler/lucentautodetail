# Lucent Auto Detail

Next.js website for Lucent Auto Detail, prepared for Render deployment.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## Render

This repository includes `render.yaml` for a Node web service:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check: `/`

Create the service from the Render Dashboard Blueprint flow:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/SimplyTyler/lucentautodetail
```
