import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default defineConfig([...next, ...ts, { settings: { next: { rootDir: 'web/' } } }, globalIgnores(['**/.next/**', '**/.mda/**', 'web/next-env.d.ts', 'web/public/wasm/**', 'agent/shared/**', 'playwright-report/**', 'test-results/**'])]);
