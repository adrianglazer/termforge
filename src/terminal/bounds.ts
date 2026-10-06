export const MAX_TERMINAL_INPUT_BYTES = 16 * 1024;

export const validateTerminalInput = (text: string): void => {
  if (new TextEncoder().encode(text).byteLength > MAX_TERMINAL_INPUT_BYTES)
    throw new Error('Terminal text input is limited to 16 KiB.');
};

export const retainTerminalOutput = (output: string, maximumBytes: number): string => {
  if (!Number.isFinite(maximumBytes) || maximumBytes <= 0) return '';
  const bytes = new TextEncoder().encode(output);
  if (bytes.byteLength <= maximumBytes) return output;
  let start = bytes.byteLength - Math.floor(maximumBytes);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  while (start < bytes.byteLength) {
    try {
      return decoder.decode(bytes.slice(start));
    } catch {
      start += 1;
    }
  }
  return '';
};
