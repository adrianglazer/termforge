import { registerWebModule, NativeModule } from 'expo';

// TermforgeTerminalModule is not available on the web platform.
class TermforgeTerminalModule extends NativeModule<{}> {}

export default registerWebModule(TermforgeTerminalModule, 'TermforgeTerminalModule');
