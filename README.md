# dunes-lite

A light theme for the Claude desktop and mobile apps: dithered sand dunes under a terracotta sun. The scene is still (no animation) and the panels use glass with no blur, so it stays fast.

- `/dunes` turns the theme on, `/dunes off` turns it off. The choice is remembered across sessions.
- `/custom-theme` replaces it; run `/dunes` to bring it back.

## Install

At the prompt of a terminal session:

```
/plugin install dunes-lite --marketplace FranElfers/dunes-lite
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```bash
claude plugin install dunes-lite --marketplace FranElfers/dunes-lite
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `FranElfers/dunes-lite`, then **Add plugin**.

## Changing the scene

The scene is generated: edit `gen-dunes.mjs`, then run

```bash
node gen-dunes.mjs dunes.png hooks/scene.ts
```

It writes `hooks/scene.ts` (the SVG the theme draws) plus a PNG preview.
