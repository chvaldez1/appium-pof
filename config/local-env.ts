import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Shell/CI values take precedence; local device choices stay out of Git.
const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

export function requiredSetting(name: string, target: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running ${target}.`);
  return value;
}
