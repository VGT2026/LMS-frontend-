/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  /** Comma-separated emails treated as superadmin until API returns role */
  readonly VITE_SUPERADMIN_EMAILS?: string;
  /** When "true", superadmin admin CRUD uses localStorage mock data */
  readonly VITE_USE_MOCK_SUPERADMIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
