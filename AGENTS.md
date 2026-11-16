# AGENTS.md — dunes-lite

Notes for agents working on this theme mod for the Claude desktop/mobile apps.

## Layout

- `.claude-plugin/plugin.json` — name and version. Bump `version` on every release, or installed copies won't see an update.
- `.claude-plugin/marketplace.json` — makes this repo its own marketplace (`source: "./"`).
- `hooks/hooks.json` — points at `./register.tsx`.
- `hooks/register.tsx` — sets the look at `session.start`, registers `/dunes` (`/dunes off`), and draws the scene in a `ui.render` hook on `Backdrop`.
- `hooks/make-colors.js` / `.d.ts` — the design system's color helper, copied as-is. Never edit; recopy from the plugin-authoring skill when the build updates.
- `hooks/scene.ts` — generated. Never edit by hand.
- `gen-dunes.mjs` — generates `hooks/scene.ts` plus PNG previews: `node gen-dunes.mjs <preview.png> hooks/scene.ts`.

## Colors

- Always build colors with `makeColors`; hand-written token names paint nothing and fail silently.
- Check the palette in Node before shipping: no line in `problems` may start with `Desktop won't paint` (that makes Desktop ignore the whole theme). Other lines are minor and can stay.
- Both `light` and `dark` halves are given and `only` is left out, so the app picks the half by its own light/dark mode.

## Scene and performance

- The original "dither-dunes" was slow because of animation + blur. Rules that keep this fast:
  - Still scene: no CSS animation in the SVG.
  - `glass: { blur: 0, opacity: 0.8 }` — panels translucent with no blur.
- A still `backdrop: { image }` ground does NOT work for this look: the conversation panels are opaque over it, so the dunes don't show. Use a `scene` with glass.
- The scene SVG must stay under 131,072 characters. Each dot is a zero-length, square-capped stroke (`m dx 0h0`) inside one `<path>` per color, which keeps it ~43K.
- Day/night switching lives inside the SVG: colors come from CSS classes, overridden in `@media (prefers-color-scheme: dark)`. The `Backdrop` hook gets no mode info, so this media query is the only way to follow the mode.
- Keep `surface-0`, `surface-1` and the scene's ground the same color in each mode (`#ede3cf` day, `#231d18` night). Measured from screenshots: the title bar is opaque `surface-0`, while the chat area is glass tinted with `surface-1` at 80 % over the scene. If the three differ, the title bar visibly differs from the chat.
- Keep dune dots light and sparse in the middle and at the bottom (where text and the composer sit), or text over them is hard to read.
- The `Backdrop` hook only draws when `e.props.scene === 'dunes'`, so it never answers for another plugin's scene.
- Don't put `$.ui.status(set.reason)` at `session.start`: no app is attached yet, so it shows a stale "no attached desktop or mobile client" line.

## Testing

- Claude can't control the Claude app's own window, so it can't screenshot the theme there. Ask the user to look, in both modes.
- To check the scene alone: extract the SVG from `hooks/scene.ts`, serve it locally, and open it in the built-in browser with color-scheme emulation set to light and then dark.
- In a brand-new chat, before the first message, the app shows the remembered colors but no scene, and `/dunes` answers "not a command here": no session (so no plugin) is running yet. The scene appears once the session starts. This is app behavior, not a bug in the mod.
- `/custom-theme` (theme-examples plugin) clears any mod's theme, this one included. Run `/dunes` to bring it back.
- During development a copy in the session's dev-mods folder hot-reloads on each edit. Editing any file reloads it and re-runs `session.start`. Remove that copy once the plugin is installed, or two copies both register `/dunes`.
- The `claude` CLI isn't on PATH on this machine, so `claude plugin validate` and `claude plugin test` don't run.

## Releasing an update

1. Bump `version` in `.claude-plugin/plugin.json`, then commit and push to `main`.
2. Before pushing, check that no keys, internal URLs or private data are in the files.
3. Update the local marketplace copy: `git -C ~/.claude/plugins/marketplaces/dunes-lite pull --ff-only`.
4. **Restart the Claude desktop app.** It only re-reads marketplaces on startup, and there's no button to refresh one. Until the restart the plugin keeps showing the old version and its Update button stays greyed out.
5. In Plugins, press Update on `dunes-lite`, then open a new session.
