export const MAX_TERMINAL_INPUT_BYTES = 16 * 1024;

export const validateTerminalInput = (text: string): void => {
  if (new TextEncoder().encode(text).byteLength > MAX_TERMINAL_INPUT_BYTES)
    throw new Error('Terminal text input is limited to 16 KiB.');
};

export const retainTerminalOutput = (output: string, maximumBytes: number): string => {
  const bytes = new TextEncoder().encode(output);
  if (bytes.byteLength <= maximumBytes) return output;
  return new TextDecoder().decode(bytes.slice(bytes.byteLength - maximumBytes));
};
