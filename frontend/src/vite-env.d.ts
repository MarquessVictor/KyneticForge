/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

/** Injected by Vite `define` from package.json. */
declare const __APP_VERSION__: string;
