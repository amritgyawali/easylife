import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';

import { APP_NAME } from '@/constants/app';
import { spacing } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';
import { Card } from '@/components/ui/Card';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

export interface AuthScreenLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  const { width } = useWindowDimensions();
  const compact = useCompactLayout();
  const visualViewportHeight = useVisualViewportHeight();
  const pageGutter = compact ? spacing.md : spacing.xl;
  const cardWidth = Math.min(width - pageGutter * 2, 420);
  const keyboardRegionStyle = visualViewportHeight != null ? { height: visualViewportHeight } : { flex: 1 };

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={keyboardRegionStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: pageGutter,
          }}
        >
          <View style={{ width: cardWidth, gap: compact ? spacing.lg : spacing.xl }}>
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
