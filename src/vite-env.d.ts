/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional base URL for direct Energy-Charts requests (see .env.example). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
