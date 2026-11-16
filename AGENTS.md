# AGENTS.md — dunes-lite

Notes for agents working on this theme mod for the Claude desktop/mobile apps.

## Layout

- `.claude-plugin/plugin.json` — name and version. Bump `version` on every release, or installed copies won't see an update.
- `.claude-plugin/marketplace.json` — makes this repo its own marketplace (`source: "./"`).
- `hooks/hooks.json` — points at `./register.tsx`.
- `hooks/register.tsx` — sets the look at `session.start`, registers `/dunes` (`/dunes off`), and draws the scene in a `ui.render` hook on `Backdrop`.
- `hooks/weekly-limit.ts` — status line under the prompt: average % per day left of the weekly limit and % used in the last 24 h (history in `$.store`, key `weeklyHistory`); "Restante" only in the last 24 h before the reset. Called from `register.tsx`, not listed in `hooks.json`: 0.3.0 listed it as a second module and the theme stopped loading.
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
- Keep `surface-0`, `surface-1` and the scene's ground the same color in each mode (`#ede3cf` day, `#231d18` night). The chat area is glass tinted with `surface-1` at 80 % over the scene; keeping all three equal gives a flat, uniform chat area.
- The title bar is always ~14 % darker than the chat area (measured: title ≈ chat × 0.86 across four palettes). No theme token controls it: the title bar is glass over the scene, then shaded by the app. Fixed with a lighter band at the top of the scene (`BAND` in `gen-dunes.mjs`): night `#352d25`, 37 px high, measured to make the title bar exactly `#231d18`. The scene draws ~1.2× the screen-capture scale, so 37 scene px = the 44 px title bar in a capture. If the night ground changes, recalibrate the band by measuring. Day has no band: cream is too close to white to compensate.
- Keep dune dots light and sparse in the middle and at the bottom (where text and the composer sit), or text over them is hard to read.
- The `Backdrop` hook only draws when `e.props.scene === 'dunes'`, so it never answers for another plugin's scene.
- Don't put `$.ui.status(set.reason)` at `session.start`: no app is attached yet, so it shows a stale "no attached desktop or mobile client" line.

## Testing

- Claude can't control the Claude app's own window (computer use refuses it). It can still read colors: capture the screen from PowerShell (`System.Drawing` `Graphics.CopyFromScreen` to a PNG in the scratchpad) and sample pixels with Python/PIL.
- Test changes without commit/push/restart through a local copy in the session's dev-mods folder (`~/.claude/dev-mods/<session-id>/dunes-lite-dev/`). It hot-reloads when the turn ends. Rename everything that would clash with the installed plugin: `name` in `plugin.json` to `dunes-lite-dev`, the scene to `dunes-dev` (in `LOOK` and in the `Backdrop` guard), and the command to `dunes-dev`. Its theme is set after the installed one, so it wins until the session ends. One edit equals one reload, so it's one experiment per turn.
- To check the scene alone: extract the SVG from `hooks/scene.ts`, serve it locally, and open it in the built-in browser with color-scheme emulation set to light and then dark.
- In a brand-new chat, before the first message, the app shows the remembered colors but no scene, and `/dunes` answers "not a command here": no session (so no plugin) is running yet. The scene appears once the session starts. This is app behavior, not a bug in the mod.
- `/custom-theme` (theme-examples plugin) clears any mod's theme, this one included. Run `/dunes` to bring it back.
- Never keep a dev copy under the same names as the installed plugin: both would register `/dunes` and draw the `dunes` scene.
- The `claude` CLI isn't on PATH on this machine, so `claude plugin validate` and `claude plugin test` don't run.

## Releasing an update

1. Bump `version` in `.claude-plugin/plugin.json`, then commit and push to `main`.
2. Before pushing, check that no keys, internal URLs or private data are in the files.
3. Update the local marketplace copy: `git -C ~/.claude/plugins/marketplaces/dunes-lite pull --ff-only`.
4. **Restart the Claude desktop app.** It only re-reads marketplaces on startup, and there's no button to refresh one. Until the restart the plugin keeps showing the old version and its Update button stays greyed out.
5. In Plugins, press Update on `dunes-lite`, then open a new session.
