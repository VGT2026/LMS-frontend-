/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  /** Comma-separated emails treated as superadmin until API returns role */
  readonly VITE_SUPERADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
