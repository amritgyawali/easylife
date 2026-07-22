import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { spacing, minTouchTarget, radius } from '@/constants/theme';
import { REGIONAL_DEFAULTS, SUPPORTED_CURRENCIES } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUpdatePreferences, useUpdateProfile } from '@/features/auth/useProfile';
import { createOnboardingAccount } from '@/features/auth/onboarding-api';
import { toUserMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kathmandu', label: 'Kathmandu (NPT)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'UTC', label: 'UTC' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ne', label: 'नेपाली (Nepali)' },
] as const;

const DATE_SYSTEM_OPTIONS = [
  { value: 'AD', label: 'AD (Gregorian)' },
  { value: 'BS', label: 'BS (Bikram Sambat)' },
] as const;

const WEEK_START_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
] as const;

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }));

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();

  const [step, setStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState<string>(REGIONAL_DEFAULTS.primaryCurrency);
  const [timezone, setTimezone] = useState<string>(REGIONAL_DEFAULTS.timezone);
  const [language, setLanguage] = useState<'en' | 'ne'>(REGIONAL_DEFAULTS.primaryLanguage);
  const [dateSystem, setDateSystem] = useState<'AD' | 'BS'>(REGIONAL_DEFAULTS.dateSystem);
  const [weekStart, setWeekStart] = useState<'0' | '1'>('0');
  const [openingCashBalance, setOpeningCashBalance] = useState('0');
  const [wantsBankAccount, setWantsBankAccount] = useState(false);
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankOpeningBalance, setBankOpeningBalance] = useState('0');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const finish = async (skipRest: boolean) => {
    if (!user) return;
    setIsFinishing(true);
    setError(null);

    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim() || undefined,
        defaultCurrency: currency,
        onboardingCompleted: true,
      });

      await updatePreferences.mutateAsync({
        timezone,
        language,
        dateSystem,
        weekStart: Number(weekStart),
        notificationPreferencesEnabled: notificationsEnabled,
      });

      if (!skipRest) {
        await createOnboardingAccount(user.id, {
          name: 'Cash',
          accountType: 'cash',
          currency,
          openingBalance: openingCashBalance,
        });

        if (wantsBankAccount && bankAccountName.trim()) {
          await createOnboardingAccount(user.id, {
            name: bankAccountName.trim(),
            accountType: 'bank',
            currency,
            openingBalance: bankOpeningBalance,
          });
        }
      }

      router.replace('/');
    } catch (err) {
      logger.error('onboarding.finish_failed', err);
      setError(toUserMessage(err));
      setIsFinishing(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.xl,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="title" weight="bold">
            Let&apos;s set things up
          </ThemedText>
          <ThemedText variant="body" tone="muted">
            Step {step + 1} of {TOTAL_STEPS}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: radius.full,
                  backgroundColor: index <= step ? theme.colors.primary : theme.colors.border,
                }}
              />
            ))}
          </View>
        </View>

        <Card>
          <View style={{ gap: spacing.lg }}>
            {step === 0 ? (
              <>
                <ThemedText variant="subtitle">About you</ThemedText>
                <View style={{ gap: spacing.xs }}>
                  <ThemedText variant="label" tone="muted">
                    Your name
                  </ThemedText>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. Amrit"
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
                <OptionGroup
                  label="Default currency"
                  options={CURRENCY_OPTIONS}
                  value={currency}
                  onChange={setCurrency}
                />
              </>
            ) : null}

            {step === 1 ? (
              <>
                <ThemedText variant="subtitle">Regional preferences</ThemedText>
                <OptionGroup
                  label="Time zone"
                  options={[...TIMEZONE_OPTIONS]}
                  value={timezone}
                  onChange={setTimezone}
                />
                <OptionGroup
                  label="Language"
                  options={[...LANGUAGE_OPTIONS]}
                  value={language}
                  onChange={setLanguage}
                />
                <OptionGroup
                  label="Date display"
                  options={[...DATE_SYSTEM_OPTIONS]}
                  value={dateSystem}
                  onChange={setDateSystem}
                />
                <OptionGroup
                  label="Week starts on"
                  options={[...WEEK_START_OPTIONS]}
                  value={weekStart}
                  onChange={setWeekStart}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <ThemedText variant="subtitle">Starting balances</ThemedText>
                <View style={{ gap: spacing.xs }}>
                  <ThemedText variant="label" tone="muted">
                    Opening cash balance ({currency})
                  </ThemedText>
                  <TextInput
                    value={openingCashBalance}
                    onChangeText={setOpeningCashBalance}
                    keyboardType="decimal-pad"
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
                <Button
                  label={wantsBankAccount ? 'Remove bank / wallet account' : '+ Add a bank or wallet account'}
                  variant="secondary"
                  onPress={() => setWantsBankAccount((prev) => !prev)}
                />
                {wantsBankAccount ? (
                  <View style={{ gap: spacing.md }}>
                    <View style={{ gap: spacing.xs }}>
                      <ThemedText variant="label" tone="muted">
                        Account name
                      </ThemedText>
                      <TextInput
                        value={bankAccountName}
                        onChangeText={setBankAccountName}
                        placeholder="e.g. NIC Asia Savings"
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
                    <View style={{ gap: spacing.xs }}>
                      <ThemedText variant="label" tone="muted">
                        Opening balance ({currency})
                      </ThemedText>
                      <TextInput
                        value={bankOpeningBalance}
                        onChangeText={setBankOpeningBalance}
                        keyboardType="decimal-pad"
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
                  </View>
                ) : null}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <ThemedText variant="subtitle">Notifications</ThemedText>
                <ThemedText variant="body" tone="muted">
                  Get reminders for tasks, habits, bills and loan due dates. You can fine-tune this anytime in
                  Settings.
                </ThemedText>
                <OptionGroup
                  options={[
                    { value: 'on', label: 'Enable reminders' },
                    { value: 'off', label: 'Not now' },
                  ]}
                  value={notificationsEnabled ? 'on' : 'off'}
                  onChange={(v) => setNotificationsEnabled(v === 'on')}
                />
              </>
            ) : null}

            {error ? (
              <ThemedText variant="body" tone="negative" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            ) : null}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
          <Button
            label="Skip and configure later"
            variant="ghost"
            disabled={isFinishing}
            onPress={() => finish(true)}
          />
          {step < TOTAL_STEPS - 1 ? (
            <Button label="Next" onPress={() => setStep((s) => s + 1)} />
          ) : (
            <Button label="Finish setup" loading={isFinishing} onPress={() => finish(false)} />
          )}
        </View>
        {step > 0 ? (
          <Button
            label="Back"
            variant="secondary"
            disabled={isFinishing}
            onPress={() => setStep((s) => s - 1)}
          />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}
