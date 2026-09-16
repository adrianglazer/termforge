import { registerWebModule, NativeModule } from 'expo';

// TermforgeSecureStorageModule is not available on the web platform.
class TermforgeSecureStorageModule extends NativeModule<{}> {}

export default registerWebModule(TermforgeSecureStorageModule, 'TermforgeSecureStorageModule');
