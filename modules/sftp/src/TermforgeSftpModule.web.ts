import { registerWebModule, NativeModule } from 'expo';

import type { TermforgeSftpModuleEvents } from './TermforgeSftp.types';

// TermforgeSftpModule is not available on the web platform.
class TermforgeSftpModule extends NativeModule<TermforgeSftpModuleEvents> {}

export default registerWebModule(TermforgeSftpModule, 'TermforgeSftpModule');
