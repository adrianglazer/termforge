import { AccessibilityInfo } from 'react-native';

/** Reads the platform preference; callers must avoid introducing decorative animation when true. */
export async function prefersReducedMotion(): Promise<boolean> {
  return AccessibilityInfo.isReduceMotionEnabled();
}
