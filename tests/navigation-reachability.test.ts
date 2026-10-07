import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('navigation reachability', () => {
  it('keeps retained navigation destinations reachable and removes Settings and onboarding from the menu', () => {
    const menu = [...source('src/components/HomeNavigation.tsx').matchAll(/\['(\/[^']+)',/g)].map(
      (match) => match[1]!,
    );
    expect(menu).not.toContain('/settings');
    expect(menu).not.toContain('/onboarding');
    const purchase = [
      ...source('src/access/AccessPanel.tsx').matchAll(/href="(\/[^"?]+)(?:\?[^\"]*)?"/g),
    ].map((match) => match[1]!);
    expect(source('src/components/HomeNavigation.tsx')).toContain(
      "Linking.openURL('https://termforge.glazer.es/support')",
    );
    expect(source('src/access/AccessProvider.tsx')).toContain('href="/access"');
    const destinations = new Set(['/servers', '/palette', '/access', ...menu, ...purchase]);
    const screens = readdirSync(path.join(root, 'app'))
      .filter(
        (file) =>
          file.endsWith('.tsx') &&
          !file.startsWith('_') &&
          !file.startsWith('+') &&
          !['index.tsx', 'settings.tsx', 'onboarding.tsx'].includes(file),
      )
      .map((file) => '/' + file.replace('.tsx', ''));
    expect([...destinations].sort()).toEqual(screens.sort());
    for (const route of destinations)
      expect(existsSync(path.join(root, 'app', route.slice(1) + '.tsx'))).toBe(true);
  });
});
