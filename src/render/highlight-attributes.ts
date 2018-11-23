import { asColor } from '../support/utils'
import nvim from '../core/neovim'

export interface Attrs {
  foreground?: number
  background?: number
  special?: number
  reverse?: string
  italic?: string
  bold?: string
  underline?: boolean
  undercurl?: boolean
  cterm_fg?: number
  cterm_bg?: number
}

interface HighlightGroup {
  foreground?: string
  background?: string
  special?: string
  underline: boolean
  reverse: boolean
}

const defaultColors = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ef5188',
}

// TODO: info - store the HighlightGroup name somewhere
// this can be used to lookup items in the grid, for example:
// find all positions where a char(s) start with Search hlgrp
const highlightInfo = new Map<number, any>()
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D
const highlights = new Map<number, HighlightGroup>([
  [0, {
    background: defaultColors.background,
    foreground: defaultColors.foreground,
    special: defaultColors.special,
    underline: false,
    reverse: false,
  }]
])

export const setDefaultColors = (fg: number, bg: number, sp: number) => {
  const foreground = fg >= 0 ? asColor(fg) : defaultColors.foreground
  const background = bg >= 0 ? asColor(bg) : defaultColors.background
  const special = sp >= 0 ? asColor(sp) : defaultColors.special

  const same = defaultColors.foreground === foreground
    && defaultColors.background === background
    && defaultColors.special === special

  if (same) return false

  Object.assign(defaultColors, { foreground, background, special })

  nvim.state.foreground = defaultColors.foreground
  nvim.state.background = defaultColors.background
  nvim.state.special = defaultColors.special

  // hlid 0 -> default highlight group
  highlights.set(0, {
    foreground,
    background,
    special,
    underline: false,
    reverse: false,
  })

  return true
}

export const addHighlight = (id: number, attr: Attrs, info: any) => {
  const foreground = attr.reverse
    ? asColor(attr.background)
    : asColor(attr.foreground)

  const background = attr.reverse
    ? asColor(attr.foreground)
    : asColor(attr.background)

  highlightInfo.set(id, info)

  highlights.set(id, {
    foreground,
    background,
    special: asColor(attr.special),
    underline: !!(attr.underline || attr.undercurl),
    reverse: !!attr.reverse,
  })
}

export const getHighlight = (id: number) => highlights.get(id)
export const getBackground = (id: number) => {
  const { background } = highlights.get(id) || {} as HighlightGroup
  return background || highlights.get(0)!.background
}

export const generateColorLookupAtlas = () => {
  // hlid are 0 indexed, but width starts at 1
  canvas.width = Math.max(...highlights.keys()) + 1
  canvas.height = 3

  ui.imageSmoothingEnabled = false

  ;[...highlights.entries()].forEach(([ id, hlgrp ]) => {
    const defbg = hlgrp.reverse
      ? defaultColors.foreground
      : defaultColors.background
    ui.fillStyle = hlgrp.background || defbg
    ui.fillRect(id, 0, 1, 1)

    const deffg = hlgrp.reverse
      ? defaultColors.background
      : defaultColors.foreground
    ui.fillStyle = hlgrp.foreground || deffg
    ui.fillRect(id, 1, 1, 1)

    if (!hlgrp.underline || !hlgrp.special) return

    ui.fillStyle = hlgrp.special
    ui.fillRect(id, 2, 1, 1)
  })

  return canvas
}

export const getColorAtlas = () => canvas