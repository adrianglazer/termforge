export type KeyProtection = 'userPresence' | 'biometryCurrentSet';

export type NativeKeyMetadata = {
  reference: string;
  algorithm: 'ed25519';
  publicKey: string;
  fingerprint: string;
  protection: KeyProtection;
};

export type NativePublicKey = Pick<NativeKeyMetadata, 'algorithm' | 'publicKey' | 'fingerprint'>;
