import { AppError } from '@/application/errors';

const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

export function snippetVariables(command: string): string[] {
  return [
    ...new Set([...command.matchAll(variablePattern)].map((match) => match[1]).filter(Boolean)),
  ] as string[];
}

/** Rendering is explicit: missing values reject rather than executing an incomplete command. */
export function renderSnippet(command: string, values: Record<string, string>): string {
  return command.replace(variablePattern, (_match, name: string) => {
    const value = values[name];
    if (value === undefined || !value.trim())
      throw new AppError('INVALID_CONFIG', `Provide a value for ${name}.`);
    return value;
  });
}

/** Send line breaks as terminal Enter keys, including the final command. */
export function snippetInput(command: string): string {
  if (!command.trim()) throw new AppError('INVALID_CONFIG', 'Enter a command to run.');
  const input = command.replace(/\r?\n/g, '\r');
  return input.endsWith('\r') ? input : `${input}\r`;
}
