/// <reference types="node" />
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// jsdom ne resout pas @import "tailwindcss" ni les variables CSS custom, et
// le plugin @tailwindcss/vite reecrit le contenu des imports `.css` (y
// compris `?raw`) dans le graphe de modules. On lit donc le fichier source
// directement sur disque pour verifier le texte non transforme : cela garde
// une valeur de non-regression sur les tokens "Console Pro" et sur la
// contrainte "pas de degrade" (cf. Global Constraints).
const cssPath = fileURLToPath(new URL('./globals.css', import.meta.url))
const css = readFileSync(cssPath, 'utf-8')

// Les commentaires CSS documentent la contrainte "pas de degrade" et
// contiennent donc eux-memes le mot "gradient" : on les retire avant de
// verifier les regles CSS effectives.
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('tokens Console Pro (globals.css)', () => {
  it('declare le primary indigo Console Pro', () => {
    expect(css).toContain('#6366f1')
  })

  it('declare le sidebar encre et le foreground Console Pro', () => {
    expect(css).toContain('#111827')
  })

  it('declare la grille de spacing 4px', () => {
    expect(css).toContain('--spacing: 0.25rem')
  })

  it("ne contient aucun degrade (Global Constraint : surfaces plates uniquement)", () => {
    expect(cssWithoutComments.toLowerCase()).not.toContain('gradient')
  })
})
