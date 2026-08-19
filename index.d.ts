export type Identity = {
  id: string;
  email?: string;
  /** Optional event-path globs (`*`, `teamplay/*`, an exact path) this identity may call. */
  allowed?: string[];
};

export type Session = { token: string; user: Identity };

export type AsyncAwaitWebsocket = WebSocket & {
  sid: string;
  sendSync: (event: string, data: any) => void;
  sendAsync: (event: string, data: any, timeout?: number) => any;
  /** Log in and remember the session across automatic reconnects. */
  login: (credentials: any, event?: string) => Promise<Session>;
  /** Restore a session from a token you stored yourself. */
  authenticate: (token: string) => Promise<Session>;
  logout: () => Promise<void>;
};

export type AuthProvider =
  | "sqlite"
  | { name: "sqlite" }
  | {
      name: string;
      /** Redirect the browser to the provider. */
      start: (request: Request) => Response | Promise<Response>;
      /** Verify the provider's callback and return the profile it vouches for. */
      callback: (request: Request) => Promise<{ subject: string; email?: string }>;
      /** Where to send the browser afterwards; the token arrives in the URL fragment. */
      redirect?: string;
    };

/**
 * A custom store only needs what the features you enable actually call:
 * sessions always, `verify`/`createUser` for password login, `createReset`/
 * `consumeReset` for password resets, and the provider pair for social login.
 */
export type AuthStore = {
  createSession: (user: Identity, ttl: number) => string | Promise<string>;
  readSession: (token: string) => Identity | null | Promise<Identity | null>;
  endSession: (token: string) => any;
  findUser?: (email: string) => Identity | null | Promise<Identity | null>;
  createUser?: (user: { email?: string; password?: string }) => Promise<Identity>;
  verify?: (email: string, password: string) => Promise<Identity | null>;
  createReset?: (user: Identity, ttl: number) => string | Promise<string>;
  consumeReset?: (token: string, password: string) => Promise<Identity | null>;
  findByProvider?: (link: { provider: string; subject: string }) => any;
  linkProvider?: (link: { provider: string; subject: string; user: Identity }) => any;
};

export type AuthConfig = {
  providers?: AuthProvider[];
  /** SQLite filename for the built-in store. Ignored when `store` is given. */
  database?: string;
  /** Bring your own user store (mongo, an API key file, anything). */
  store?: AuthStore;
  session?: { ttl?: number };
  reset?: { ttl?: number };
  /** Called with a freshly minted reset token so your app can deliver it. */
  onReset?: (reset: { user: Identity; token: string }) => any;
};
