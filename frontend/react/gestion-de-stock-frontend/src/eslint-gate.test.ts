import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

/**
 * Garde-fou de régression pour la Global Constraint du socle :
 * ESLint doit bloquer les valeurs arbitraires Tailwind (`p-[13px]`) et le
 * style inline d'espacement (`style={{ padding: ... }}`), et ne doit pas
 * pénaliser les classes Tailwind normales.
 *
 * Vérifié via l'API Node d'ESLint (flat config `eslint.config.js`) plutôt
 * qu'en relisant des fichiers du dépôt, pour rester un test unitaire rapide
 * et indépendant du contenu applicatif.
 */
const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

async function lint(code: string) {
  const [result] = await eslint.lintText(code, { filePath: 'virtual.tsx' });
  return result.messages.map((m) => m.ruleId);
}

describe('gate ESLint (arbitrary values / inline spacing)', () => {
  it('rejette une classe Tailwind à valeur arbitraire', async () => {
    const ruleIds = await lint(`
      export function C() {
        return <div className="p-[13px]">x</div>;
      }
    `);
    expect(ruleIds).toContain('tailwindcss/no-arbitrary-value');
  });

  it('rejette un style inline de padding/margin', async () => {
    const ruleIds = await lint(`
      export function C() {
        return <div style={{ padding: 4, marginTop: 7 }}>x</div>;
      }
    `);
    expect(ruleIds.filter((id) => id === 'no-restricted-syntax')).toHaveLength(2);
  });

  it("n'émet aucune erreur du gate sur des classes Tailwind normales", async () => {
    const ruleIds = await lint(`
      export function C() {
        return <div className="p-4 mt-2">x</div>;
      }
    `);
    expect(ruleIds).not.toContain('tailwindcss/no-arbitrary-value');
    expect(ruleIds).not.toContain('no-restricted-syntax');
  });
});
