import { NativeModule, requireNativeModule } from 'expo';

import type {
  KeyProtection,
  NativeKeyMetadata,
  NativePublicKey,
} from './TermforgeSecureStorage.types';

declare class TermforgeSecureStorageModule extends NativeModule {
  generateEd25519Key(protection: KeyProtection): Promise<NativeKeyMetadata>;
  proveProtectedUse(reference: string, reason: string): Promise<boolean>;
  publicKey(reference: string, reason: string): Promise<NativePublicKey>;
  deleteKey(reference: string, reason: string): Promise<void>;
}

export default requireNativeModule<TermforgeSecureStorageModule>('TermforgeSecureStorage');
