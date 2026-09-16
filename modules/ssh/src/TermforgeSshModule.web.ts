import { registerWebModule, NativeModule } from 'expo';

import type { TermforgeSshModuleEvents } from './TermforgeSsh.types';

// TermforgeSshModule is not available on the web platform.
class TermforgeSshModule extends NativeModule<TermforgeSshModuleEvents> {}

export default registerWebModule(TermforgeSshModule, 'TermforgeSshModule');
