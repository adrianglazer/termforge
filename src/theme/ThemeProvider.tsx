import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { SettingsRepository } from '@/settings/repository';
import { colors, lightColors } from './tokens';

type ThemeTokens = Record<keyof typeof colors, string>;
const ThemeContext = createContext<ThemeTokens>(colors);
export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeTokens>(colors);
  useEffect(() => {
    void (async () => {
      try {
        const database = await openMetadataDatabase();
        const settings = await new SettingsRepository(database).get();
        setTheme(settings.theme.includes('Light') ? lightColors : colors);
      } catch {
        /* Keep the safe dark default. */
      }
    })();
  }, []);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
