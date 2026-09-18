import { describe, expect, it } from 'vitest'
// Import Vite `?raw` : le fichier CSS est charge comme une simple chaine, non
// transformee. jsdom ne resout pas @import "tailwindcss" ni les variables CSS
// custom, donc on verifie le fichier source en texte : cela garde une valeur
// de non-regression sur les tokens "Console Pro" et sur la contrainte
// "pas de degrade" (cf. Global Constraints), sans dependre de modules Node
// (le typage `?raw` vient de `vite/client`, deja dans tsconfig.app.json).
import css from './globals.css?raw'

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
