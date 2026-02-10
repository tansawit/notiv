/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LINEAR_OAUTH_CLIENT_ID?: string;
  readonly VITE_ALLOW_LINEAR_PAT_FALLBACK?: string;
}

declare module '*.css?inline' {
  const content: string;
  export default content;
}
