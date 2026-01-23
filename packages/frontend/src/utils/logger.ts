// packages/frontend/src/utils/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (isDev) console.debug(`[DEBUG] ${msg}`, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (isDev) console.info(`[INFO] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (isDev) console.warn(`[WARN] ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${msg}`, ...args);
    // Future: integrate with error tracking (Sentry, etc.)
  },
};
