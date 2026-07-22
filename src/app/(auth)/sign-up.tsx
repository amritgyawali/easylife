import { useState } from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScreenLayout } from '@/components/layout/AuthScreenLayout';
import { FormTextInput } from '@/components/forms/FormTextInput';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/constants/theme';
import { signUpSchema, type SignUpFormValues } from '@/features/auth/schemas';
import { signUpWithPassword } from '@/features/auth/api';
import { toUserMessage } from '@/utils/errors';

export default function SignUpScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setSubmitError(null);
    try {
      const result = await signUpWithPassword({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      });

      if (result.requiresEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        router.replace('/onboarding');
      }
    } catch (error) {
      setSubmitError(toUserMessage(error));
    }
  };

  if (confirmationSent) {
    return (
      <AuthScreenLayout
        title="Check your email"
        subtitle="We've sent a confirmation link to finish creating your account."
      >
        <ThemedText variant="body" tone="muted">
          Once confirmed, come back and sign in.
        </ThemedText>
        <Link href="/(auth)/sign-in">
          <ThemedText variant="body" tone="primary" weight="semibold">
            Back to sign in
          </ThemedText>
        </Link>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Create your account" subtitle="Your personal life and finance workspace.">
      <FormProvider {...form}>
        <View style={{ gap: spacing.lg }}>
          <FormTextInput name="fullName" label="Full name" autoComplete="name" textContentType="name" />
          <FormTextInput
            name="email"
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FormTextInput
            name="password"
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            helpText="At least 8 characters, with upper, lower case and a number."
          />
          <FormTextInput
            name="confirmPassword"
            label="Confirm password"
            secureTextEntry
            autoCapitalize="none"
          />
          {submitError ? (
            <ThemedText variant="body" tone="negative" accessibilityLiveRegion="polite">
              {submitError}
            </ThemedText>
          ) : null}
          <Button
            label="Create account"
            onPress={form.handleSubmit(onSubmit)}
            loading={form.formState.isSubmitting}
            fullWidth
          />
        </View>
      </FormProvider>

      <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
        <ThemedText variant="body" tone="muted">
          Already have an account?
        </ThemedText>
        <Link href="/(auth)/sign-in">
          <ThemedText variant="body" tone="primary" weight="semibold">
            Sign in
          </ThemedText>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}
