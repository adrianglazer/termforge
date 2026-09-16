import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';
import { colors } from './tokens';

const ThemeContext = createContext(colors);
export function ThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
