import { describe, expect, it } from 'vitest';
import { safeSystemPath } from '@/navigation/systemPath';

describe('external link admission before router decoding', () => {
  it('preserves valid routes and UTF-8 parameters', () => {
    expect(safeSystemPath('termforge://terminal?serverId=server-1')).toBe(
      'termforge://terminal?serverId=server-1',
    );
    expect(safeSystemPath('termforge://keys?name=%E2%82%AC')).toBe(
      'termforge://keys?name=%E2%82%AC',
    );
  });
  it('rejects malformed, nested and oversized escape sequences', () => {
    for (const path of [
      'termforge://keys?name=%FF',
      '/?x=%E2%82',
      '/?x=%',
      '/?x=%25FF',
      '/?x=%2525FF',
      '/?x=' + '%FF'.repeat(2000),
      '/?x=' + 'a'.repeat(8192),
    ]) {
      expect(safeSystemPath(path)).toBe('/');
    }
  });
});
