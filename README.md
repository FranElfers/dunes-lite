# dunes-lite

A theme for the Claude desktop and mobile apps: dithered sand dunes under a terracotta sun. It has a day and a night version and follows the app's light or dark mode on its own. The scene is still (no animation) and the panels use glass with no blur, so it stays fast.

- `/dunes` turns the theme on, `/dunes off` turns it off. The choice is remembered across sessions.
- `/custom-theme` replaces it; run `/dunes` to bring it back.
- A status line under the prompt shows the % you can use per day and the % of the weekly limit used in the last 24 hours. In the last 24 hours before the weekly reset (Monday 11am) it also shows what is left, as "Restante".

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

It writes `hooks/scene.ts` (the SVG the theme draws, with both palettes) plus a day and a night PNG preview.
