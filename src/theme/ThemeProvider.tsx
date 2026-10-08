import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { SettingsRepository } from '@/settings/repository';
import { colors, lightColors } from './tokens';

type ThemeTokens = Record<keyof typeof colors, string>;
const ThemeRefreshContext = createContext(async () => {});
const ThemeContext = createContext<ThemeTokens>(colors);
export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeTokens>(colors);
  const refresh = useCallback(async () => {
    try {
      const settings = await new SettingsRepository(await openMetadataDatabase()).get();
      setTheme(settings.theme.includes('Light') ? lightColors : colors);
    } catch {
      /* Keep the current theme if preferences cannot be loaded. */
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <ThemeRefreshContext.Provider value={refresh}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeRefreshContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export const useThemeRefresh = () => useContext(ThemeRefreshContext);
