import { useMemo, type PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';

import { getEnv, EnvValidationError } from '@/constants/env';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/constants/theme';

/**
 * Validates required environment configuration once, before anything else
 * mounts. A misconfigured deployment (missing Supabase URL/key) fails loudly
 * with actionable instructions instead of a confusing runtime crash deep in
 * the Supabase client.
 */
export function EnvGate({ children }: PropsWithChildren) {
  const validationError = useMemo<EnvValidationError | null>(() => {
    try {
      getEnv();
      return null;
    } catch (error) {
      if (error instanceof EnvValidationError) return error;
      throw error;
    }
  }, []);

  if (validationError) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
          <ThemedText variant="title" tone="negative">
            App is not configured
          </ThemedText>
          <ThemedText variant="body" tone="muted">
            {validationError.message}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return children;
}
