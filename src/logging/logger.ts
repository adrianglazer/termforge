import type { AppError } from '@/application/errors';
type Context = Record<string, string | number | boolean | undefined>;
const sanitize = (context: Context): Context =>
  Object.fromEntries(
    Object.entries(context).filter(
      ([key]) => !/(password|secret|token|host|command|output|path|key)/i.test(key),
    ),
  );
export const logger = {
  error(event: string, context: Context = {}, error?: AppError | Error) {
    const code = error && 'code' in error ? String(error.code) : undefined;
    console.error(JSON.stringify({ event, ...sanitize(context), code }));
  },
};
