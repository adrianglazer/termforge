import { describe, expect, it } from 'vitest';

import {
  dynamicFontSize,
  onboardingSteps,
  paletteMatches,
  paletteRoute,
  paneAccessibility,
  preparedSnippet,
  supportedThemes,
  themeTokens,
  workspaceAxis,
} from '@/ui/controller';

describe('screen controller presentation rules', () => {
  it('keeps onboarding explicit and palette navigation inert', () => {
    expect(onboardingSteps).toHaveLength(3);
    expect(paletteMatches([{ name: 'Production' }, { name: 'Staging' }], 'prod')).toEqual([
      { name: 'Production' },
    ]);
    expect(paletteRoute('server', 'server-1')).toEqual({
      pathname: '/terminal',
      params: { serverId: 'server-1' },
    });
    expect(paletteRoute('workspace', 'workspace-1')).toEqual({ pathname: '/workspaces' });
  });

  it('prepares snippets for an explicit terminal action without executing them', () => {
    const result = preparedSnippet(
      {
        id: 'snippet-1',
        name: 'Deploy',
        commandTemplate: 'deploy {{env}}',
        description: '',
        category: 'Ops',
        favorite: false,
        variables: ['env'],
        createdAt: 'now',
        updatedAt: 'now',
      },
      { env: 'staging' },
    );
    expect(result).toEqual({
      command: 'deploy staging',
      route: { pathname: '/terminal', params: { snippet: 'deploy staging' } },
    });
  });

  it('selects supported themes and accessible adaptive presentation values', () => {
    expect(supportedThemes).toHaveLength(6);
    expect(themeTokens('Solarized Light').background).toBe('#f8fafc');
    expect(themeTokens('Dracula').background).toBe('#0d1117');
    expect(workspaceAxis('row', 390)).toBe('column');
    expect(workspaceAxis('row', 800)).toBe('row');
    expect(dynamicFontSize(17, 2)).toBe(32);
    expect(paneAccessibility('Production', true)).toEqual({
      label: 'Production pane, focused',
      hint: 'Double tap to focus this terminal pane.',
      selected: true,
    });
  });
});
