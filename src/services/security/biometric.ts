import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
  available: boolean;
}

/** Biometric hardware/enrollment is native-only — not supported on web. */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') {
    return { hasHardware: false, isEnrolled: false, available: false };
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;

  return { hasHardware, isEnrolled, available: hasHardware && isEnrolled };
}

export interface BiometricAuthResult {
  success: boolean;
  /** True when the user explicitly cancelled — used to decide whether to offer the PIN fallback immediately. */
  cancelled: boolean;
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricAuthResult> {
  if (Platform.OS === 'web') return { success: false, cancelled: false };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
    cancelLabel: 'Use PIN instead',
  });

  return {
    success: result.success,
    cancelled: !result.success && result.error === 'user_cancel',
  };
}
