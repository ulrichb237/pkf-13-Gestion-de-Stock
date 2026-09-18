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
])
