import { safeSystemPath } from '@/navigation/systemPath';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return safeSystemPath(path);
}
