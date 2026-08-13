import { useMemo, type PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';

import { getEnv, EnvValidationError } from '@/constants/env';
import { ThemedText } from '@/components/ui/ThemedText';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { layout, spacing } from '@/constants/theme';

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
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing.xl,
            gap: spacing.md,
            width: '100%',
            maxWidth: layout.narrow,
            alignSelf: 'center',
          }}
        >
          <ThemedText variant="title">App is not configured</ThemedText>
          <InlineMessage tone="negative" message={validationError.message} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return children;
}
