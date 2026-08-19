export type Identity = {
  id: string;
  email?: string;
  allowed?: string[];
};

export type Session = { token: string; user: Identity };

export type AsyncAwaitWebsocket = WebSocket & {
  sid: string;
  sendSync: (event: string, data: any) => void;
  sendAsync: (event: string, data: any, timeout?: number) => any;
};

export type AuthProvider =
  | "sqlite"
  | { name: "sqlite" }
  | {
      name: string;
      start: (request: Request) => Response | Promise<Response>;
      callback: (request: Request) => Promise<{ subject: string; email?: string }>;
      redirect?: string;
    };

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
  database?: string;
  store?: AuthStore;
  session?: { ttl?: number };
  reset?: { ttl?: number };
  onReset?: (reset: { user: Identity; token: string }) => any;
};
