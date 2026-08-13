import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform, TextInput, View, type AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/auth/useProfile';
import { useAppLockStore } from '@/stores/app-lock-store';
import { authenticateWithBiometrics } from '@/services/security/biometric';
import { isPinSet, verifyPin } from '@/services/security/pin';
import { useTheme } from '@/hooks/useTheme';
import { spacing, controlHeight, radius, fontSize } from '@/constants/theme';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { webStyle } from '@/utils/interaction';
import { APP_NAME } from '@/constants/app';

/**
 * Wraps the authenticated app tree. Tracks foreground/background
 * transitions and, once the user has been away longer than their configured
 * auto-lock interval, shows a full-screen lock overlay (biometric first,
 * PIN fallback) before any screen content is visible again. Web has no
 * equivalent OS-level biometric/lock concept, so this is a no-op there.
 */
export function AppLockGate({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { data } = useProfile();
  const { isLocked, lastBackgroundedAt, lock, unlock, recordBackgrounded } = useAppLockStore();
  const appState = useRef(AppState.currentState);

  const biometricEnabled = data?.preferences.biometric_lock_enabled ?? false;
  const pinEnabled = data?.preferences.pin_lock_enabled ?? false;
  const autoLockMinutes = data?.preferences.auto_lock_minutes ?? 5;
  const lockingEnabled = Platform.OS !== 'web' && session && (biometricEnabled || pinEnabled);

  useEffect(() => {
    if (!lockingEnabled) return undefined;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        recordBackgrounded();
        return;
      }

      if (nextState === 'active' && previousState.match(/inactive|background/) && lastBackgroundedAt) {
        const elapsedMinutes = (Date.now() - lastBackgroundedAt) / 60_000;
        if (elapsedMinutes >= autoLockMinutes) {
          lock();
        }
      }
    });

    return () => subscription.remove();
  }, [lockingEnabled, lastBackgroundedAt, autoLockMinutes, lock, recordBackgrounded]);

  if (lockingEnabled && isLocked) {
    return <LockScreen biometricEnabled={biometricEnabled} pinEnabled={pinEnabled} onUnlock={unlock} />;
  }

  return children;
}

interface LockScreenProps {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  onUnlock: () => void;
}

function LockScreen({ biometricEnabled, pinEnabled, onUnlock }: LockScreenProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pinAvailable, setPinAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (pinEnabled) {
      isPinSet().then(setPinAvailable);
    }
  }, [pinEnabled]);

  const tryBiometric = async () => {
    setIsAuthenticating(true);
    setError(null);
    const result = await authenticateWithBiometrics('Unlock Amrit LifeOS');
    setIsAuthenticating(false);
    if (result.success) onUnlock();
  };

  useEffect(() => {
    // Auto-prompting biometrics is the whole point of this screen appearing
    // at all, so the immediate setState inside tryBiometric() is intentional
    // — not an accidental cascading render.
    if (biometricEnabled) {
      void tryBiometric();
    }
    // Only auto-prompt once when the lock screen first mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPin = async () => {
    const isValid = await verifyPin(pin);
    if (isValid) {
      onUnlock();
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <View style={{ gap: spacing.lg, width: '100%', maxWidth: 340 }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name="lock-closed" size={26} color={theme.colors.textMuted} />
          </View>
          <ThemedText variant="title">{APP_NAME}</ThemedText>
          <ThemedText variant="body" tone="muted">
            App is locked
          </ThemedText>
        </View>

        {biometricEnabled ? (
          <Button
            label="Unlock with biometrics"
            icon="finger-print"
            size="lg"
            onPress={tryBiometric}
            loading={isAuthenticating}
            fullWidth
          />
        ) : null}

        {pinEnabled && pinAvailable ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              placeholder="Enter PIN"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="PIN"
              style={[
                {
                  minHeight: controlHeight.lg,
                  borderWidth: 1,
                  borderColor: error ? theme.colors.negative : theme.colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  textAlign: 'center',
                  letterSpacing: 8,
                  fontSize: fontSize.lg,
                },
                webStyle({ outlineStyle: 'none' }),
              ]}
            />
            {error ? <InlineMessage tone="negative" message={error} /> : null}
            <Button
              label="Unlock with PIN"
              variant="secondary"
              size="lg"
              onPress={submitPin}
              disabled={pin.length < 4}
              fullWidth
            />
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}
