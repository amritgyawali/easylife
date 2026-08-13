import { useState, type ReactNode } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { List, ListRow } from '@/components/ui/List';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { TextField } from '@/components/forms/TextField';
import { minTouchTarget, spacing } from '@/constants/theme';
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

/**
 * Settings, grouped into cards by what each group affects.
 *
 * The groups tile into columns on a wide window and stack on a phone, which
 * keeps a long single column of unrelated toggles from being the only way to
 * find anything — and puts the destructive action at the end, on its own.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);

  const [fullName, setFullName] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [status, setStatus] = useState<{ tone: 'positive' | 'negative'; message: string } | null>(null);

  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Settings" />}>
        <SkeletonList rows={6} />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen header={<ScreenHeader title="Settings" />}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const { profile, preferences } = data;
  const displayName = fullName ?? profile.full_name ?? '';

  const saveName = async () => {
    setIsSavingName(true);
    try {
      await updateProfile.mutateAsync({ fullName: displayName });
      setStatus({ tone: 'positive', message: 'Name updated.' });
    } catch (err) {
      setStatus({ tone: 'negative', message: toUserMessage(err) });
    } finally {
      setIsSavingName(false);
    }
  };

  const runPreferenceUpdate = async (mutate: () => Promise<unknown>) => {
    try {
      await mutate();
    } catch (err) {
      setStatus({ tone: 'negative', message: toUserMessage(err) });
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
      setStatus({ tone: 'negative', message: 'PIN must be at least 4 digits.' });
      return;
    }
    setIsSettingPin(true);
    try {
      await setPin(pinDraft);
      await updatePreferences.mutateAsync({ pinLockEnabled: true });
      setPinDraft('');
      setStatus({ tone: 'positive', message: 'PIN lock enabled.' });
    } catch (err) {
      setStatus({ tone: 'negative', message: toUserMessage(err) });
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
    const message =
      'This permanently deletes your account and all data — tasks, notes, transactions, documents, everything. This cannot be undone.';

    const run = async () => {
      try {
        await deleteAccount();
        router.replace('/(auth)/sign-in');
      } catch (err) {
        setStatus({ tone: 'negative', message: toUserMessage(err) });
      }
    };

    // `Alert` is a no-op on react-native-web, so the browser's own confirm
    // stands in — otherwise the account would be deleted with no confirmation.
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete your account?\n\n${message}`)) void run();
      return;
    }

    Alert.alert('Delete your account?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <Screen width="wide" header={<ScreenHeader title="Settings" subtitle={user?.email ?? undefined} />}>
      {status ? <InlineMessage tone={status.tone} message={status.message} /> : null}

      <Grid minColumnWidth={360} maxColumns={2}>
        <Section title="Profile">
          <TextField
            label="Name"
            value={displayName}
            onChangeText={setFullName}
            placeholder="Your name"
            autoComplete="name"
          />
          <Button
            label="Save name"
            onPress={saveName}
            loading={isSavingName}
            variant="secondary"
            icon="checkmark"
          />
        </Section>

        <Section title="Appearance">
          <OptionGroup
            label="Theme"
            variant="segmented"
            options={THEME_OPTIONS}
            value={themePreference}
            onChange={setThemePreference}
          />
          <ThemedText variant="caption" tone="muted">
            System follows your device&apos;s light or dark setting.
          </ThemedText>
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
            variant="segmented"
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
            variant="segmented"
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

        {Platform.OS !== 'web' ? (
          <Section title="App lock">
            <ToggleRow
              label="Biometric unlock"
              description="Use your fingerprint or face to unlock."
              value={preferences.biometric_lock_enabled}
              onValueChange={toggleBiometric}
            />
            <ToggleRow
              label="PIN unlock"
              description="A short code as a fallback to biometrics."
              value={preferences.pin_lock_enabled}
              onValueChange={(enabled) => {
                if (!enabled) {
                  void updatePreferences.mutateAsync({ pinLockEnabled: false });
                }
              }}
            />
            {!preferences.pin_lock_enabled ? (
              <View style={{ gap: spacing.sm }}>
                <TextField
                  label="New PIN"
                  value={pinDraft}
                  onChangeText={setPinDraft}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholder="4 digits or more"
                />
                <Button label="Set PIN" onPress={handleSetPin} loading={isSettingPin} variant="secondary" />
              </View>
            ) : null}
            <ThemedText variant="caption" tone="muted">
              The app locks automatically after {preferences.auto_lock_minutes} minutes in the background.
            </ThemedText>
          </Section>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Data & sync" />
          <List>
            <ListRow
              icon="cloud-download-outline"
              title="Data & backup"
              subtitle="Export your data, or restore from a backup file."
              onPress={() => router.push('/settings/data')}
              chevron
            />
            <ListRow
              icon="sync-outline"
              title="Sync & notifications"
              subtitle="Queued changes and reminder settings."
              onPress={() => router.push('/settings/sync')}
              chevron
            />
          </List>
        </View>

        <Section title="Account">
          <Button
            label="Sign out"
            variant="secondary"
            icon="log-out-outline"
            onPress={handleSignOut}
            loading={isSigningOut}
          />
          <ThemedText variant="caption" tone="muted">
            Signed in as {user?.email ?? 'this device'}.
          </ThemedText>
        </Section>
      </Grid>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Danger zone" />
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
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm, height: '100%' }}>
      <SectionHeader title={title} />
      <Card style={{ gap: spacing.md, flex: 1 }}>{children}</Card>
    </View>
  );
}

/** Label, explanation and a switch — the standard settings toggle row. */
function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ThemedText variant="body">{label}</ThemedText>
        {description ? (
          <ThemedText variant="caption" tone="muted">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}
