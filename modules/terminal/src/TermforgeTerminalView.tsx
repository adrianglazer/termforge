import { requireNativeView } from 'expo';
import * as React from 'react';

import type { TermforgeTerminalViewProps } from './TermforgeTerminal.types';

const NativeView: React.ComponentType<TermforgeTerminalViewProps> =
  requireNativeView('TermforgeTerminal');

export default function TermforgeTerminalView(props: TermforgeTerminalViewProps) {
  return <NativeView {...props} />;
}
