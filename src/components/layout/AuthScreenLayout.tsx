import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';

import { APP_NAME } from '@/constants/app';
import { elevation, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { Card } from '@/components/ui/Card';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

export interface AuthScreenLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

/**
 * The frame every sign-in / sign-up / recovery screen sits in.
 *
 * These are the only screens rendered before the app shell exists, so they
 * carry the product's first impression on their own: the brand mark, a
 * centred card that never exceeds a comfortable form width, and — on web —
 * the same keyboard-viewport handling the sheets use, so the submit button
 * can't end up hidden behind a mobile browser's keyboard.
 */
export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const compact = useCompactLayout();
  const visualViewport = useVisualViewport();
  const pageGutter = compact ? spacing.lg : spacing.xl;
  const cardWidth = Math.min(width - pageGutter * 2, 440);
  const keyboardRegionStyle =
    visualViewport != null
      ? {
          position: 'absolute' as const,
          top: visualViewport.top,
          left: visualViewport.left,
          width: visualViewport.width,
          height: visualViewport.height,
        }
      : { flex: 1 };

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
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: cardWidth, gap: compact ? spacing.xl : spacing.xxl }}>
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              <View
                accessible={false}
                style={[
                  {
                    width: 52,
                    height: 52,
                    borderRadius: radius.lg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary,
                  },
                  elevation('md', theme.mode),
                ]}
              >
                <ThemedText variant="subtitle" weight="bold" style={{ color: theme.colors.primaryText }}>
                  {APP_NAME.slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>

              <View style={{ alignItems: 'center', gap: spacing.xs }}>
                <ThemedText variant="title" accessibilityRole="header">
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText variant="body" tone="muted" style={{ textAlign: 'center' }}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            <Card variant="elevated" style={{ gap: spacing.xl, padding: compact ? spacing.lg : spacing.xl }}>
              {children}
            </Card>

            <ThemedText variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
              {APP_NAME} · your data stays yours
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
