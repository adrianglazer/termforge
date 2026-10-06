import { safeError } from '@/application/errors';

type Context = Record<string, string | number | boolean | undefined>;
const events = new Set(['connection_failed', 'metadata_startup_failed', 'ui_boundary']);
const numericContext = new Set([
  'attempt',
  'bytes',
  'durationMs',
  'generation',
  'sequence',
  'total',
]);
const sanitize = (context: Context): Context =>
  Object.fromEntries(
    Object.entries(context).filter(
      ([key, value]) =>
        numericContext.has(key) &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0,
    ),
  );
export const logger = {
  error(event: string, context: Context = {}, error?: Error) {
    console.error(
      JSON.stringify({
        event: events.has(event) ? event : 'application_error',
        ...sanitize(context),
        code: error ? safeError(error).code : undefined,
      }),
    );
  },
};
