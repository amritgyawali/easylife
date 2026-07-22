import { useState, type ReactNode } from 'react';
import { Alert, Platform, ScrollView, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { spacing, minTouchTarget, radius } from '@/constants/theme';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore, type ThemePreference } from '@/stores/theme-store';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile, useUpdatePreferences, useUpdateProfile } from '@/features/auth/useProfile';
import { signOut } from '@/features/auth/api';
import { deleteAccount } from '@/features/auth/delete-account';
import { getBiometricAvailability } from '@/services/security/biometric';
import { setPin } from '@/services/security/pin';
import { toUserMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }));

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);

  const [fullName, setFullName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl }}>
        <SkeletonList rows={6} />
      </ScrollView>
    );
  }

  if (isError || !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  const { profile, preferences } = data;
  const displayName = fullName || profile.full_name || '';

  const saveName = async () => {
    setIsSavingName(true);
    try {
      await updateProfile.mutateAsync({ fullName: displayName });
      setStatusMessage('Name updated.');
    } catch (err) {
      setStatusMessage(toUserMessage(err));
    } finally {
      setIsSavingName(false);
    }
  };

  const runPreferenceUpdate = async (mutate: () => Promise<unknown>) => {
    try {
      await mutate();
    } catch (err) {
      setStatusMessage(toUserMessage(err));
    }
  };

  const toggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      const availability = await getBiometricAvailability();
      if (!availability.available) {
        Alert.alert(
          'Biometrics not available',
          'Set up a fingerprint or face unlock in your device settings first.'
        );
        return;
      }
    }
    await runPreferenceUpdate(() => updatePreferences.mutateAsync({ biometricLockEnabled: enabled }));
  };

  const handleSetPin = async () => {
    if (pinDraft.length < 4) {
      setStatusMessage('PIN must be at least 4 digits.');
      return;
    }
    setIsSettingPin(true);
    try {
      await setPin(pinDraft);
      await updatePreferences.mutateAsync({ pinLockEnabled: true });
      setPinDraft('');
      setStatusMessage('PIN lock enabled.');
    } catch (err) {
      setStatusMessage(toUserMessage(err));
    } finally {
      setIsSettingPin(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      logger.error('settings.sign_out_failed', err);
      setIsSigningOut(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all data — tasks, notes, transactions, documents, everything. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/(auth)/sign-in');
            } catch (err) {
              Alert.alert('Could not delete account', toUserMessage(err));
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.xl,
        maxWidth: 640,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <ThemedText variant="title" weight="bold">
        Settings
      </ThemedText>

      {statusMessage ? (
        <ThemedText variant="body" tone="muted" accessibilityLiveRegion="polite">
          {statusMessage}
        </ThemedText>
      ) : null}

      <Section title="Profile">
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            Name
          </ThemedText>
          <TextInput
            defaultValue={profile.full_name ?? ''}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textMuted}
            style={{
              minHeight: minTouchTarget,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              color: theme.colors.text,
            }}
          />
        </View>
        <ThemedText variant="body" tone="muted">
          {user?.email}
        </ThemedText>
        <Button label="Save name" onPress={saveName} loading={isSavingName} variant="secondary" />
      </Section>

      <Section title="Regional">
        <OptionGroup
          label="Default currency"
          options={CURRENCY_OPTIONS}
          value={profile.default_currency}
          onChange={(value) =>
            void runPreferenceUpdate(() => updateProfile.mutateAsync({ defaultCurrency: value }))
          }
        />
        <OptionGroup
          label="Date display"
          options={[
            { value: 'AD', label: 'AD (Gregorian)' },
            { value: 'BS', label: 'BS (Bikram Sambat)' },
          ]}
          value={preferences.date_system}
          onChange={(value) =>
            void runPreferenceUpdate(() =>
              updatePreferences.mutateAsync({ dateSystem: value as 'AD' | 'BS' })
            )
          }
        />
        <OptionGroup
          label="Week starts on"
          options={[
            { value: '0', label: 'Sunday' },
            { value: '1', label: 'Monday' },
          ]}
          value={String(preferences.week_start)}
          onChange={(value) =>
            void runPreferenceUpdate(() => updatePreferences.mutateAsync({ weekStart: Number(value) }))
          }
        />
      </Section>

      <Section title="Appearance">
        <OptionGroup
          label="Theme"
          options={THEME_OPTIONS}
          value={themePreference}
          onChange={setThemePreference}
        />
      </Section>

      {Platform.OS !== 'web' ? (
        <Section title="App lock">
          <Row>
            <ThemedText variant="body">Biometric unlock</ThemedText>
            <Switch value={preferences.biometric_lock_enabled} onValueChange={toggleBiometric} />
          </Row>
          <Row>
            <ThemedText variant="body">PIN unlock</ThemedText>
            <Switch
              value={preferences.pin_lock_enabled}
              onValueChange={(enabled) => {
                if (!enabled) {
                  void updatePreferences.mutateAsync({ pinLockEnabled: false });
                }
              }}
            />
          </Row>
          {!preferences.pin_lock_enabled ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                value={pinDraft}
                onChangeText={setPinDraft}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={8}
                placeholder="New PIN (4+ digits)"
                placeholderTextColor={theme.colors.textMuted}
                style={{
                  flex: 1,
                  minHeight: minTouchTarget,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  color: theme.colors.text,
                }}
              />
              <Button label="Set PIN" onPress={handleSetPin} loading={isSettingPin} variant="secondary" />
            </View>
          ) : null}
          <ThemedText variant="caption" tone="muted">
            App locks automatically after {preferences.auto_lock_minutes} minutes in the background.
          </ThemedText>
        </Section>
      ) : null}

      <Section title="Account">
        <Button label="Sign out" variant="secondary" onPress={handleSignOut} loading={isSigningOut} />
      </Section>

      <Section title="Danger zone">
        <ThemedText variant="body" tone="muted">
          Deleting your account permanently removes all your data. This cannot be undone.
        </ThemedText>
        <Button label="Delete my account" variant="danger" onPress={confirmDeleteAccount} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <ThemedText variant="subtitle">{title}</ThemedText>
      <Card>
        <View style={{ gap: spacing.md }}>{children}</View>
      </Card>
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {children}
    </View>
  );
}
