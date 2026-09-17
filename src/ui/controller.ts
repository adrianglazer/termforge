import { renderSnippet } from '@/snippets/template';
import { colors, lightColors, terminalThemes } from '@/theme/tokens';
import type { Snippet } from '@/types/domain';

export const onboardingSteps = [
  'Create a trusted server',
  'Protect an SSH key',
  'Use remote tools',
] as const;

export const paletteMatches = <T extends { name: string }>(items: T[], query: string): T[] => {
  const normalized = query.trim().toLowerCase();
  return items.filter((item) => !normalized || item.name.toLowerCase().includes(normalized));
};

export const paletteRoute = (kind: 'server' | 'workspace' | 'snippet', id: string) =>
  kind === 'server'
    ? { pathname: '/terminal' as const, params: { serverId: id } }
    : kind === 'workspace'
      ? { pathname: '/workspaces' as const }
      : { pathname: '/snippets' as const };

export const preparedSnippet = (snippet: Snippet, values: Record<string, string>) => {
  const command = renderSnippet(snippet.commandTemplate, values);
  return { command, route: { pathname: '/terminal' as const, params: { snippet: command } } };
};

export const themeTokens = (theme: string) => (theme.includes('Light') ? lightColors : colors);
export const supportedThemes = terminalThemes;

export const workspaceAxis = (axis: 'row' | 'column', width: number): 'row' | 'column' =>
  axis === 'row' && width >= 700 ? 'row' : 'column';

export const dynamicFontSize = (base: number, multiplier: number): number =>
  Math.min(32, Math.max(12, Math.round(base * multiplier)));

export const paneAccessibility = (title: string | undefined, focused: boolean) => ({
  label: `${title ?? 'Disconnected terminal'} pane${focused ? ', focused' : ''}`,
  hint: 'Double tap to focus this terminal pane.',
  selected: focused,
});
