import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScreenLayout } from '@/components/layout/AuthScreenLayout';
import { FormTextInput } from '@/components/forms/FormTextInput';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/constants/theme';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas';
import { updatePassword } from '@/features/auth/api';
import { toUserMessage } from '@/utils/errors';

/**
 * Reached after the user follows the password-reset email link, which
 * Supabase turns into an authenticated (recovery-type) session before
 * landing here — updatePassword() operates on that session.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setSubmitError(null);
    try {
      await updatePassword(values.password);
      router.replace('/');
    } catch (error) {
      setSubmitError(toUserMessage(error));
    }
  };

  return (
    <AuthScreenLayout title="Set a new password" subtitle="Choose a new password for your account.">
      <FormProvider {...form}>
        <View style={{ gap: spacing.lg }}>
          <FormTextInput
            name="password"
            label="New password"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />
          <FormTextInput
            name="confirmPassword"
            label="Confirm new password"
            secureTextEntry
            autoCapitalize="none"
          />
          {submitError ? (
            <ThemedText variant="body" tone="negative" accessibilityLiveRegion="polite">
              {submitError}
            </ThemedText>
          ) : null}
          <Button
            label="Update password"
            onPress={form.handleSubmit(onSubmit)}
            loading={form.formState.isSubmitting}
            fullWidth
          />
        </View>
      </FormProvider>
    </AuthScreenLayout>
  );
}
