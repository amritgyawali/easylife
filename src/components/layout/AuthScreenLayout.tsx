import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { APP_NAME } from '@/constants/app';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useCompactLayout';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { Card } from '@/components/ui/Card';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

export interface AuthScreenLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

const HIGHLIGHTS: { icon: 'wallet-outline' | 'checkbox-outline' | 'cloud-offline-outline'; text: string }[] = [
  { icon: 'wallet-outline', text: 'Every account, loan and investment in one ledger' },
  { icon: 'checkbox-outline', text: 'Tasks, habits and notes beside the numbers' },
  { icon: 'cloud-offline-outline', text: 'Works offline — changes sync when you reconnect' },
];

/**
 * Sign-in / sign-up chrome.
 *
 * On a phone this is a single centred column, sized to the *visible* viewport
 * so the keyboard can't push the submit button out of reach. On a desktop
 * viewport it becomes a two-pane layout: the form keeps its comfortable 420px
 * measure instead of floating alone in the middle of a 1600px window, and the
 * left pane says what the product is — the one screen where that's useful.
 */
export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  const theme = useTheme();
  const { compact, width, expanded } = useLayout();
  const visualViewport = useVisualViewport();
  const pageGutter = compact ? spacing.lg : spacing.xl;
  const cardWidth = Math.min(width - pageGutter * 2, 420);
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

  const form = (
    <View style={{ width: cardWidth, gap: compact ? spacing.lg : spacing.xl }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        {!expanded ? (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
              marginBottom: spacing.sm,
            }}
          >
            <Ionicons name="layers" size={24} color={theme.colors.primaryText} />
          </View>
        ) : null}
        <ThemedText variant="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="body" tone="muted" style={{ textAlign: 'center' }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Card elevation="md">
        <View style={{ gap: spacing.lg }}>{children}</View>
      </Card>
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={[keyboardRegionStyle, { flexDirection: 'row' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {expanded ? <BrandPane /> : null}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: pageGutter,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {form}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function BrandPane() {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 420,
        padding: spacing.xxl,
        justifyContent: 'center',
        gap: spacing.xl,
        backgroundColor: theme.colors.accentSurface,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primary,
          }}
        >
          <Ionicons name="layers" size={24} color={theme.colors.primaryText} />
        </View>
        <ThemedText variant="subtitle" weight="bold">
          {APP_NAME}
        </ThemedText>
      </View>

      <ThemedText variant="display">Your life and your money, in one place.</ThemedText>

      <View style={{ gap: spacing.md }}>
        {HIGHLIGHTS.map((highlight) => (
          <View key={highlight.text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name={highlight.icon} size={20} color={theme.colors.primary} />
            <ThemedText variant="body" style={{ flex: 1 }}>
              {highlight.text}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
