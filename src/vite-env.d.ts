/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY?: string;
  readonly VITE_DEEPSEEK_MODEL?: string;
  readonly VITE_DEEPSEEK_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
