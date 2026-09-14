// Registers a resolve hook so tests can import project TypeScript modules
// (extensionless relative imports and the "@/" alias) under Node's native
// type stripping. Usage: node --import ./tests/register.mjs --test tests/*.test.ts
import { register } from 'node:module'
register('./resolve-hook.mjs', import.meta.url)
