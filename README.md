# specs-golf-guide
AR golf practice companion for Snap SPECS smart glasses — Learn AR with SPECS Hackathon 2026

## Local interaction prototype

Requires Node.js 24 or newer. No package installation is needed.

```powershell
node prototype/server.mjs
```

Open `http://127.0.0.1:4173` in a browser. This top-down prototype reuses the
putting engine, session reducer, floor-coordinate adapter, roll sampler, and
interaction adapter. It is a local validation tool, not a replacement for the
required SPECS Lens or Interactive Preview verification.

Run the complete automated suite with:

```powershell
node --test --experimental-strip-types test/*.test.ts
```
