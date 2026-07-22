import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScreenLayout } from '@/components/layout/AuthScreenLayout';
import { FormTextInput } from '@/components/forms/FormTextInput';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/constants/theme';
import { magicLinkSchema, type MagicLinkFormValues } from '@/features/auth/schemas';
import { signInWithMagicLink } from '@/features/auth/api';
import { toUserMessage } from '@/utils/errors';

export default function MagicLinkScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: MagicLinkFormValues) => {
    setSubmitError(null);
    try {
      await signInWithMagicLink(values.email);
      setSent(true);
    } catch (error) {
      setSubmitError(toUserMessage(error));
    }
  };

  if (sent) {
    return (
      <AuthScreenLayout title="Check your email" subtitle="Tap the sign-in link we just sent you.">
        <Link href="/(auth)/sign-in">
          <ThemedText variant="body" tone="primary" weight="semibold">
            Back to sign in
          </ThemedText>
        </Link>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Sign in with a magic link" subtitle="We'll email you a one-time sign-in link.">
      <FormProvider {...form}>
        <View style={{ gap: spacing.lg }}>
          <FormTextInput
            name="email"
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          {submitError ? (
            <ThemedText variant="body" tone="negative" accessibilityLiveRegion="polite">
              {submitError}
            </ThemedText>
          ) : null}
          <Button
            label="Send magic link"
            onPress={form.handleSubmit(onSubmit)}
            loading={form.formState.isSubmitting}
            fullWidth
          />
        </View>
      </FormProvider>
      <Link href="/(auth)/sign-in">
        <ThemedText variant="body" tone="primary" style={{ textAlign: 'center' }}>
          Back to sign in
        </ThemedText>
      </Link>
    </AuthScreenLayout>
  );
}
