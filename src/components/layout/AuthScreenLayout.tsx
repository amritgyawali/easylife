import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';

import { APP_NAME } from '@/constants/app';
import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

export interface AuthScreenLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.xl * 2, 420);

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <View style={{ width: cardWidth, gap: spacing.xl }}>
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <ThemedText variant="title" weight="bold">
                {APP_NAME}
              </ThemedText>
              <ThemedText variant="subtitle">{title}</ThemedText>
              {subtitle ? (
                <ThemedText variant="body" tone="muted" style={{ textAlign: 'center' }}>
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>
            <Card>
              <View style={{ gap: spacing.lg }}>{children}</View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
