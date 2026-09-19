import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './use-auth';
import { apiClient } from '../api/client';
import { __purgeListenerCount, onSessionPurged, purgeSession } from '../api/auth-middleware';

const AUTH_RESPONSE = {
  accessToken: 'tok',
  refreshToken: 'ref',
  expiresIn: 36000,
  email: 'serveur@b.com',
};
const USER = { id: 1, nom: 'Doe', prenom: 'Jo', email: 'serveur@b.com' };

let loginError: string | null = null;

function Probe() {
  const { isAuthenticated, connectedUser, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{isAuthenticated ? 'connecte' : 'deconnecte'}</span>
      <span data-testid="user">{connectedUser?.nom ?? ''}</span>
      <button
        onClick={() => {
          loginError = null;
          login('saisi@b.com', 'pass').catch((e: Error) => {
            loginError = e.message;
          });
        }}
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function mount() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

function storeSession() {
  localStorage.setItem('accessToken', JSON.stringify(AUTH_RESPONSE));
  localStorage.setItem('connectedUser', JSON.stringify(USER));
}

function snapshot(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    out[k] = localStorage.getItem(k);
  }
  return out;
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Pas de @types/node dans ce projet (verifie par le build) : acces file-local a process.
const nodeProcess = (
  globalThis as unknown as {
    process: {
      on(evt: 'unhandledRejection', fn: () => void): void;
      off(evt: 'unhandledRejection', fn: () => void): void;
    };
  }
).process;

const status = () => screen.getByTestId('status');

beforeEach(() => {
  localStorage.clear();
  loginError = null;
});
afterEach(() => vi.restoreAllMocks());

describe('AuthProvider : demarrage', () => {
  it('demarre deconnecte sans session stockee', () => {
    mount();
    expect(status()).toHaveTextContent('deconnecte');
  });

  it('restaure la session et le profil depuis le stockage', () => {
    storeSession();
    mount();
    expect(status()).toHaveTextContent('connecte');
    expect(screen.getByTestId('user')).toHaveTextContent('Doe');
  });

  it('un connectedUser corrompu ne fait pas planter le montage et laisse deconnecte', () => {
    localStorage.setItem('accessToken', JSON.stringify(AUTH_RESPONSE));
    localStorage.setItem('connectedUser', '{pas du json');
    mount();
    expect(status()).toHaveTextContent('deconnecte');
    expect(screen.getByTestId('user')).toHaveTextContent('');
  });

  it('un jeton sans profil stocke reste deconnecte (jamais connecte sans connectedUser)', () => {
    localStorage.setItem('accessToken', JSON.stringify(AUTH_RESPONSE));
    mount();
    expect(status()).toHaveTextContent('deconnecte');
  });
});

describe('AuthProvider : login', () => {
  it('poste {login,password}, charge le profil avec authResponse.email et stocke la session', async () => {
    const post = vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: AUTH_RESPONSE } as never);
    let statutPendantProfil = '';
    let jetonPendantProfil: string | null = null;
    const get = vi.spyOn(apiClient, 'GET').mockImplementation((async () => {
      statutPendantProfil = status().textContent ?? '';
      jetonPendantProfil = localStorage.getItem('accessToken');
      return { data: USER };
    }) as never);

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(status()).toHaveTextContent('connecte'));

    expect(post).toHaveBeenCalledWith('/api/v1/authentification/connexion', {
      body: { login: 'saisi@b.com', password: 'pass' },
    });
    expect(get).toHaveBeenCalledWith('/api/v1/utilisateurs/email/{email}', {
      params: { path: { email: 'serveur@b.com' } }, // PAS 'saisi@b.com'
    });
    expect(statutPendantProfil).toBe('deconnecte'); // pas authentifie avant le profil
    expect(JSON.parse(jetonPendantProfil!)).toEqual(AUTH_RESPONSE); // jeton stocke avant le profil
    expect(JSON.parse(localStorage.getItem('accessToken')!)).toEqual(AUTH_RESPONSE);
    expect(JSON.parse(localStorage.getItem('connectedUser')!)).toEqual(USER);
    expect(screen.getByTestId('user')).toHaveTextContent('Doe');
  });

  it('reste deconnecte tant que le profil n\'est pas arrive', async () => {
    vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: AUTH_RESPONSE } as never);
    const profil = deferred<unknown>();
    const get = vi.spyOn(apiClient, 'GET').mockReturnValue(profil.promise as never);

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(status()).toHaveTextContent('deconnecte');
    expect(screen.getByTestId('user')).toHaveTextContent('');

    await act(async () => profil.resolve({ data: USER }));
    expect(status()).toHaveTextContent('connecte');
  });

  it('mauvais mot de passe : erreur du backend, aucun ecriture, pas d\'appel profil', async () => {
    localStorage.setItem('autre-cle', 'inchangee');
    const avant = snapshot();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(apiClient, 'POST').mockResolvedValue({
      data: undefined,
      error: { httpCode: 403, code: 'BAD_CREDENTIALS', message: 'Login et / ou mot de passe incorrect' },
    } as never);
    const get = vi.spyOn(apiClient, 'GET');

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).toBe('Login et / ou mot de passe incorrect'));

    expect(setItem).not.toHaveBeenCalled();
    expect(snapshot()).toEqual(avant);
    expect(get).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent('deconnecte');
  });

  it('backend injoignable : erreur exploitable, stockage intact', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(apiClient, 'POST').mockRejectedValue(new TypeError('Failed to fetch'));

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).not.toBeNull());

    expect(loginError).toMatch(/connexion/i);
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(status()).toHaveTextContent('deconnecte');
  });

  it('reponse 200 sans accessToken : erreur generique, rien d\'ecrit', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: {} } as never);

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).not.toBeNull());

    expect(setItem).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent('deconnecte');
  });

  it('profil en erreur apres stockage du jeton : session partielle purgee', async () => {
    vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: AUTH_RESPONSE } as never);
    vi.spyOn(apiClient, 'GET').mockResolvedValue({
      data: undefined,
      error: { httpCode: 404, message: 'Utilisateur introuvable' },
    } as never);

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).toBe('Utilisateur introuvable'));

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('connectedUser')).toBeNull();
    expect(status()).toHaveTextContent('deconnecte');
  });

  it('profil qui leve (reseau) apres stockage du jeton : session partielle purgee', async () => {
    vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: AUTH_RESPONSE } as never);
    vi.spyOn(apiClient, 'GET').mockRejectedValue(new TypeError('Failed to fetch'));

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).not.toBeNull());

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(status()).toHaveTextContent('deconnecte');
  });
});

describe('AuthProvider : logout', () => {
  it('passe deconnecte AVANT la fin de la revocation, avec le refresh token capture', async () => {
    storeSession();
    const revocation = deferred<unknown>();
    const post = vi.spyOn(apiClient, 'POST').mockReturnValue(revocation.promise as never);

    mount();
    await userEvent.click(screen.getByText('logout'));

    expect(status()).toHaveTextContent('deconnecte'); // revocation toujours en attente
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('connectedUser')).toBeNull();
    expect(post).toHaveBeenCalledWith('/api/v1/authentification/deconnexion', {
      body: { refreshToken: 'ref' },
    });

    await act(async () => revocation.resolve({ data: undefined }));
    expect(status()).toHaveTextContent('deconnecte');
  });

  it('une revocation qui echoue ne leve pas et ne ressuscite pas la session', async () => {
    storeSession();
    // Thenable non natif : vitest n'attache pas de gestionnaire a ses retours (il le fait
    // pour les vraies Promise, ce qui masquerait un rejet non gere).
    let rejeter!: (e: unknown) => void;
    const rejet = new Promise((_, rej) => {
      rejeter = rej;
    });
    const thenable = { then: (ok: never, ko: never) => rejet.then(ok, ko) };
    vi.spyOn(apiClient, 'POST').mockReturnValue(thenable as never);
    const nonGere = vi.fn();
    nodeProcess.on('unhandledRejection', nonGere);

    mount();
    await userEvent.click(screen.getByText('logout'));
    rejeter(new TypeError('Failed to fetch'));
    await new Promise((r) => setTimeout(r, 20));
    nodeProcess.off('unhandledRejection', nonGere);

    expect(nonGere).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent('deconnecte');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('sans refresh token stocke, ne tente aucune revocation', async () => {
    localStorage.setItem('connectedUser', JSON.stringify(USER));
    const post = vi.spyOn(apiClient, 'POST');
    mount();
    await userEvent.click(screen.getByText('logout'));
    expect(post).not.toHaveBeenCalled();
  });
});

describe('AuthProvider : purge externe (R36)', () => {
  it('passe deconnecte quand le middleware purge la session', () => {
    storeSession();
    mount();
    expect(status()).toHaveTextContent('connecte');

    act(() => purgeSession()); // declenche hors du provider, comme un refresh echoue

    expect(status()).toHaveTextContent('deconnecte');
    expect(screen.getByTestId('user')).toHaveTextContent('');
  });

  it('retire son abonnement au demontage (un seul abonne meme sous StrictMode)', () => {
    const base = __purgeListenerCount();
    const { unmount } = render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    );
    expect(__purgeListenerCount()).toBe(base + 1);
    unmount();
    expect(__purgeListenerCount()).toBe(base);
  });
});

describe('AuthProvider : echec de login au stade profil avec session precedente', () => {
  const PREV_BLOB = JSON.stringify({ accessToken: 'ancien', refreshToken: 'ancien-ref', expiresIn: 1, email: 'ancien@b.com' });
  const PREV_USER = JSON.stringify({ id: 9, nom: 'Ancien', prenom: 'A', email: 'ancien@b.com' });

  const cas: Array<[string, () => void]> = [
    ['profil en erreur (404)', () => {
      vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: AUTH_RESPONSE } as never);
      vi.spyOn(apiClient, 'GET').mockResolvedValue({ data: undefined, error: { message: 'introuvable' } } as never);
    }],
    ['profil qui leve', () => {
      vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: AUTH_RESPONSE } as never);
      vi.spyOn(apiClient, 'GET').mockRejectedValue(new TypeError('Failed to fetch'));
    }],
    ['reponse avec jetons mais sans email', () => {
      vi.spyOn(apiClient, 'POST').mockResolvedValue({ data: { accessToken: 'tok', refreshToken: 'ref' } } as never);
      vi.spyOn(apiClient, 'GET').mockResolvedValue({ data: USER } as never);
    }],
  ];

  it.each(cas)('%s : la session precedente est intacte', async (_nom, arranger) => {
    localStorage.setItem('accessToken', PREV_BLOB);
    localStorage.setItem('connectedUser', PREV_USER);
    arranger();
    const purge = vi.fn();
    const off = onSessionPurged(purge);

    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).not.toBeNull());
    off();

    expect(localStorage.getItem('accessToken')).toBe(PREV_BLOB);
    expect(localStorage.getItem('connectedUser')).toBe(PREV_USER);
    expect(status()).toHaveTextContent('connecte');
    expect(screen.getByTestId('user')).toHaveTextContent('Ancien');
    expect(purge).not.toHaveBeenCalled();
  });

  it.each(cas)('%s : stockage vide -> reste vide', async (_nom, arranger) => {
    arranger();
    mount();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(loginError).not.toBeNull());
    expect(localStorage.length).toBe(0);
    expect(status()).toHaveTextContent('deconnecte');
  });
});

describe('AuthProvider : profil stocke invalide', () => {
  it.each(['[]', '{}', 'null', '"x"'])('connectedUser=%s -> deconnecte', (brut) => {
    localStorage.setItem('accessToken', JSON.stringify(AUTH_RESPONSE));
    localStorage.setItem('connectedUser', brut);
    mount();
    expect(status()).toHaveTextContent('deconnecte');
  });
});
