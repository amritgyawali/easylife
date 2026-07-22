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
import { signInSchema, type SignInFormValues } from '@/features/auth/schemas';
import { signInWithPassword } from '@/features/auth/api';
import { toUserMessage } from '@/utils/errors';

export default function SignInScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInFormValues) => {
    setSubmitError(null);
    try {
      await signInWithPassword(values.email, values.password);
      router.replace('/');
    } catch (error) {
      setSubmitError(toUserMessage(error));
    }
  };

  return (
    <AuthScreenLayout title="Welcome back" subtitle="Sign in to continue to your dashboard.">
      <FormProvider {...form}>
        <View style={{ gap: spacing.lg }}>
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
            autoComplete="password"
            textContentType="password"
          />
          {submitError ? (
            <ThemedText variant="body" tone="negative" accessibilityLiveRegion="polite">
              {submitError}
            </ThemedText>
          ) : null}
          <Button
            label="Sign in"
            onPress={form.handleSubmit(onSubmit)}
            loading={form.formState.isSubmitting}
            fullWidth
          />
        </View>
      </FormProvider>

      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        <Link href="/(auth)/forgot-password">
          <ThemedText variant="label" tone="primary">
            Forgot password?
          </ThemedText>
        </Link>
        <Link href="/(auth)/magic-link">
          <ThemedText variant="label" tone="primary">
            Sign in with a magic link instead
          </ThemedText>
        </Link>
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md }}>
          <ThemedText variant="body" tone="muted">
            New here?
          </ThemedText>
          <Link href="/(auth)/sign-up">
            <ThemedText variant="body" tone="primary" weight="semibold">
              Create an account
            </ThemedText>
          </Link>
        </View>
      </View>
    </AuthScreenLayout>
  );
}
