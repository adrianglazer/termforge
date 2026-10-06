/** Reject malformed/oversized external links before Expo Router's permissive decoder. */
export function safeSystemPath(path: string): string {
  if (path.length > 8192) return '/';
  try {
    // The downstream decoder's slow fallback is only used for malformed escapes.
    // Reject encoded percent signs too: a second decoding pass must not expose
    // a newly malformed escape sequence.
    if (/%25/i.test(path)) return '/';
    decodeURIComponent(path);
    return path;
  } catch {
    return '/';
  }
}
