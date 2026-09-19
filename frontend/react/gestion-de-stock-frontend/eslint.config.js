import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import tailwindcss from 'eslint-plugin-tailwindcss'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: { tailwindcss },
    rules: {
      'tailwindcss/no-arbitrary-value': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="style"] Property[key.name=/^(padding|margin)/i]',
          message:
            "Pas de style inline pour l'espacement (padding/margin) : utiliser les classes Tailwind.",
        },
      ],
    },
  },
  {
    // Primitifs generes par `npx shadcn add` (Task 3) — liste NOMINATIVE et
    // deliberement explicite (pas un glob `src/components/ui/**`). Ce sont
    // des fichiers vendored/CLI-owned, pas du code applicatif ecrit a la
    // main : le gate "pas de valeur arbitraire" (Global Constraint) cible
    // l'espacement hardcode en dehors de la grille 4px dans le code
    // applicatif, pas les classes generees par shadcn (ex.
    // `rounded-[min(var(--radius-md),10px)]`, `color-mix(...)`) qui restent
    // pilotees par les tokens du theme. Le pattern shadcn (export du
    // composant + de ses `*Variants` cva depuis le meme fichier) declenche
    // aussi `react-refresh/only-export-components`, qui ne s'applique pas a
    // ces fichiers non hot-reloades individuellement.
    //
    // Un glob de repertoire exempterait aussi silencieusement tout futur
    // fichier ecrit a la main sous `src/components/ui/` (ex. un primitif
    // maison). En listant les noms de fichiers generes un par un, un nouveau
    // fichier hand-written dans ce dossier reste gate par defaut : il n'est
    // pas dans la liste, les regles s'appliquent. Ajouter un composant
    // shadcn plus tard = ajouter explicitement son nom de fichier ici (acte
    // visible et revu), pas une extension silencieuse du perimetre.
    // `button.test.tsx` et tout autre fichier hand-written du dossier ne
    // figurent pas dans cette liste et restent donc gates.
    files: [
      'src/components/ui/alert-dialog.tsx',
      'src/components/ui/avatar.tsx',
      'src/components/ui/badge.tsx',
      'src/components/ui/button.tsx',
      'src/components/ui/card.tsx',
      'src/components/ui/checkbox.tsx',
      'src/components/ui/command.tsx',
      'src/components/ui/dialog.tsx',
      'src/components/ui/dropdown-menu.tsx',
      'src/components/ui/input-group.tsx',
      'src/components/ui/input.tsx',
      'src/components/ui/label.tsx',
      'src/components/ui/select.tsx',
      'src/components/ui/separator.tsx',
      'src/components/ui/sheet.tsx',
      'src/components/ui/skeleton.tsx',
      'src/components/ui/sonner.tsx',
      'src/components/ui/switch.tsx',
      'src/components/ui/table.tsx',
      'src/components/ui/tabs.tsx',
      'src/components/ui/textarea.tsx',
      'src/components/ui/tooltip.tsx',
    ],
    rules: {
      'tailwindcss/no-arbitrary-value': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
