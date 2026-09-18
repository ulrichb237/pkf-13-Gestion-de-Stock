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
    // Primitifs generes par `npx shadcn add` (Task 3). Ce sont des fichiers
    // vendored/CLI-owned, pas du code applicatif ecrit a la main : le gate
    // "pas de valeur arbitraire" (Global Constraint) cible l'espacement
    // hardcode en dehors de la grille 4px dans le code applicatif, pas les
    // classes generees par shadcn (ex. `rounded-[min(var(--radius-md),10px)]`,
    // `color-mix(...)`) qui restent pilotees par les tokens du theme.
    // Le pattern shadcn (export du composant + de ses `*Variants` cva depuis
    // le meme fichier) declenche aussi `react-refresh/only-export-components`,
    // qui ne s'applique pas a ces fichiers non hot-reloades individuellement.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'tailwindcss/no-arbitrary-value': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
