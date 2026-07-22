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
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas';
import { requestPasswordReset } from '@/features/auth/api';
import { toUserMessage } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      setSubmitError(toUserMessage(error));
    }
  };

  if (sent) {
    return (
      <AuthScreenLayout title="Check your email" subtitle="If that email exists, a reset link is on its way.">
        <Link href="/(auth)/sign-in">
          <ThemedText variant="body" tone="primary" weight="semibold">
            Back to sign in
          </ThemedText>
        </Link>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Reset your password" subtitle="Enter the email on your account.">
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
            label="Send reset link"
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
