import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

// Dithered dunes look as a still SVG scene (made by ../gen-dunes.mjs): no animation, and glass with
// no blur, so the panels show the dunes without the cost of a blur. Light only, like the original.
// Applied at session.start (any edit reloads it).
const { theme, problems } = makeColors({
  label: 'Dunes lite',
  only: 'light',
  roles: { accent: '#c95a3f', danger: '#a8322b', success: '#5e7a3a', warning: '#a8741a', pro: '#7a5578' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ede3cf',
        'surface-1': '#f2e9d8',
        'surface-2': '#f8f1e4',
        'text-primary': '#2b241c',
        'text-secondary': '#5a4c3b',
        'text-muted': '#6b5d4a',
      },
    },
  },
})

const LOOK: ThemeSetArgs = { colors: theme, backdrop: { scene: 'dunes', glass: { blur: 0, opacity: 0.8 } } }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'dunes', description: 'Dunes lite theme: /dunes to turn it on, /dunes off to turn it off' })

    // The last /dunes choice is kept across sessions (on this machine); on until turned off.
    if ((await $.store.get('on')) !== false) {
      const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

      if (unpainted !== undefined) {
        $.ui.toast(unpainted)
      }

      const set = await $.theme.set(LOOK)

      if (!set.isDrawn) {
        $.ui.status(set.reason)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'dunes' }, async ($, e) => {
    if (e.args.trim() === 'off') {
      await $.store.set('on', false)
      await $.theme.clear()

      return { text: 'Dunes lite off. /dunes turns it back on.' }
    }

    await $.store.set('on', true)
    const set = await $.theme.set(LOOK)

    return { text: set.isDrawn ? 'Dunes lite on.' : `Dunes lite set, not drawn: ${set.reason}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="Dithered sand dunes under a terracotta sun" />
  })
}
