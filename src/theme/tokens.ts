export const colors = {
  background: '#0d1117',
  surface: '#161b22',
  text: '#e6edf3',
  muted: '#8b949e',
  accent: '#58a6ff',
  danger: '#f85149',
} as const;

export const lightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#111827',
  muted: '#4b5563',
  accent: '#2563eb',
  danger: '#dc2626',
} as const;

export const terminalThemes = [
  'Default Dark',
  'Default Light',
  'Solarized Dark',
  'Solarized Light',
  'Dracula',
  'Monokai',
] as const;
