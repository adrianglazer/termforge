import { NativeModule, requireNativeModule } from 'expo';

import type { TermforgeSshModuleEvents } from './TermforgeSsh.types';

declare class TermforgeSshModule extends NativeModule<TermforgeSshModuleEvents> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<TermforgeSshModule>('TermforgeSsh');
