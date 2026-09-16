import { NativeModule, requireNativeModule } from 'expo';

import type { TermforgeSftpModuleEvents } from './TermforgeSftp.types';

declare class TermforgeSftpModule extends NativeModule<TermforgeSftpModuleEvents> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<TermforgeSftpModule>('TermforgeSftp');
