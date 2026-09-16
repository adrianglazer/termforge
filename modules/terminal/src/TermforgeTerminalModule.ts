import { NativeModule, requireNativeModule } from 'expo';

declare class TermforgeTerminalModule extends NativeModule<{}> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<TermforgeTerminalModule>('TermforgeTerminal');
