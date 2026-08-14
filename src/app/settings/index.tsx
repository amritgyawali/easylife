import { useState, type ReactNode } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Section } from '@/components/ui/Section';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { SegmentedControl } from '@/components/forms/SegmentedControl';
import { spacing } from '@/constants/theme';
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
      <Screen width="prose">
        <SkeletonList rows={6} />
      </Screen>
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
    <Screen
      width="prose"
      header={<ScreenHeader title="Settings" subtitle={user?.email ?? undefined} />}
    >
      {statusMessage ? (
        <Card variant="accent">
          <ThemedText variant="label" tone="primary" accessibilityLiveRegion="polite">
            {statusMessage}
          </ThemedText>
        </Card>
      ) : null}

      <Section title="Profile">
        <Card style={{ gap: spacing.lg }}>
          <TextField
            label="Name"
            defaultValue={profile.full_name ?? ''}
            onChangeText={setFullName}
            placeholder="Your name"
          />
          <Button
            label="Save name"
            onPress={saveName}
            loading={isSavingName}
            variant="secondary"
            icon="checkmark"
          />
        </Card>
      </Section>

      <Section title="Regional">
        <Card style={{ gap: spacing.lg }}>
          <OptionGroup
            label="Default currency"
            options={CURRENCY_OPTIONS}
            value={profile.default_currency}
            size="sm"
            onChange={(value) =>
              void runPreferenceUpdate(() => updateProfile.mutateAsync({ defaultCurrency: value }))
            }
          />
          <Divider />
          <SegmentedControl
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
          <SegmentedControl
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
        </Card>
      </Section>

      <Section title="Appearance">
        <Card>
          <SegmentedControl
            label="Theme"
            options={THEME_OPTIONS}
            value={themePreference}
            onChange={setThemePreference}
            fullWidth
          />
        </Card>
      </Section>

      {Platform.OS !== 'web' ? (
        <Section title="App lock">
          <Card style={{ gap: spacing.lg }}>
            <ToggleRow
              title="Biometric unlock"
              description="Use your fingerprint or face to open the app."
              value={preferences.biometric_lock_enabled}
              onValueChange={toggleBiometric}
            />
            <Divider />
            <ToggleRow
              title="PIN unlock"
              description="A short code as a fallback to biometrics."
              value={preferences.pin_lock_enabled}
              onValueChange={(enabled) => {
                if (!enabled) {
                  void updatePreferences.mutateAsync({ pinLockEnabled: false });
                }
              }}
            />
            {!preferences.pin_lock_enabled ? (
              <View style={{ gap: spacing.md }}>
                <TextField
                  label="New PIN"
                  helpText="At least 4 digits."
                  value={pinDraft}
                  onChangeText={setPinDraft}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholder="••••"
                />
                <Button
                  label="Set PIN"
                  onPress={handleSetPin}
                  loading={isSettingPin}
                  variant="secondary"
                />
              </View>
            ) : null}
            <ThemedText variant="caption" tone="subtle">
              App locks automatically after {preferences.auto_lock_minutes} minutes in the background.
            </ThemedText>
          </Card>
        </Section>
      ) : null}

      <Section title="Data & sync">
        <Card style={{ gap: spacing.md }}>
          <Button
            label="Data & backup"
            variant="secondary"
            icon="cloud-download-outline"
            onPress={() => router.push('/settings/data')}
          />
          <Button
            label="Sync & notifications"
            variant="secondary"
            icon="sync-outline"
            onPress={() => router.push('/settings/sync')}
          />
        </Card>
      </Section>

      <Section title="Account">
        <Card>
          <Button
            label="Sign out"
            variant="secondary"
            icon="log-out-outline"
            onPress={handleSignOut}
            loading={isSigningOut}
          />
        </Card>
      </Section>

      <Section title="Danger zone">
        <Card style={{ gap: spacing.md }}>
          <ThemedText variant="body" tone="muted">
            Deleting your account permanently removes all your data. This cannot be undone.
          </ThemedText>
          <Button
            label="Delete my account"
            variant="danger"
            icon="trash-outline"
            onPress={confirmDeleteAccount}
          />
        </Card>
      </Section>
    </Screen>
  );
}

/**
 * A labelled switch with room for an explanation. The description matters
 * here: a bare "PIN unlock" toggle doesn't tell anyone what turning it on
 * actually does.
 */
function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description?: ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.lg,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ThemedText variant="body" weight="medium">
          {title}
        </ThemedText>
        {description ? (
          <ThemedText variant="caption" tone="muted">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}
