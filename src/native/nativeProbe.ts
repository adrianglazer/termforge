import { requireNativeModule } from 'expo-modules-core';

export type NativePackageCapabilities = {
  terminal: string;
  ssh: string;
  sftp: string;
  platform: 'iOS';
};

type NativeProbeModule = {
  capabilities(): NativePackageCapabilities;
};

const NativeProbe = requireNativeModule<NativeProbeModule>('TermforgeNativeProbe');

export function getNativePackageCapabilities(): NativePackageCapabilities {
  return NativeProbe.capabilities();
}
