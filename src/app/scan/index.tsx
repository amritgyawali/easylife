import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ThemedText } from '@/components/ui/ThemedText';
import { toUserMessage } from '@/utils/errors';
import { listProviders } from '@/services/ocr/providers';
import { useUploadDocument, type PickedFile } from '@/features/documents/api';
import { useFilePicker } from '@/features/documents/use-file-picker';

/**
 * Capture a document.
 *
 * Photographing a receipt and filing it works today. Reading the *text* out
 * of that photo does not, and this screen says so plainly rather than
 * offering a button that fails: on-device recognition needs a development
 * build, and this project is pinned to SDK 54 precisely so it runs in Expo Go
 * (see AGENTS.md). The engine registry is the source of that message, so it
 * corrects itself the day a provider is implemented.
 */
export default function ScanScreen() {
  const router = useRouter();
  const { pickPhoto } = useFilePicker();
  const uploadDocument = useUploadDocument();

  const [status, setStatus] = useState<string | null>(null);

  const unavailable = listProviders().filter((provider) => !provider.availability().available);

  async function capture(fromCamera: boolean) {
    setStatus(null);

    try {
      const file: PickedFile | null = await pickPhoto(fromCamera);
      if (!file) return;

      const result = await uploadDocument.mutateAsync({
        file,
        title: file.name,
        documentType: 'receipt',
      });

      setStatus(
        result.wasDuplicate
          ? 'You had already saved this exact image — nothing was uploaded again.'
          : 'Saved to your documents.'
      );
    } catch (failure) {
      setStatus(toUserMessage(failure));
    }
  }

  return (
    <Screen
      header={<ScreenHeader title="Scan" subtitle="Photograph a receipt or statement and file it away." />}
    >
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="subtitle">Capture a document</ThemedText>
        <ThemedText variant="body" tone="muted">
          The image is stored privately and can be opened from Documents at any time.
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {Platform.OS !== 'web' ? (
            <Button
              label="Take photo"
              loading={uploadDocument.isPending}
              onPress={() => void capture(true)}
            />
          ) : null}
          <Button
            label="Choose photo"
            variant="secondary"
            loading={uploadDocument.isPending}
            onPress={() => void capture(false)}
          />
        </View>
        {status ? (
          <ThemedText variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {status}
          </ThemedText>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="subtitle">Getting transactions out of a statement</ThemedText>
        <ThemedText variant="body" tone="muted">
          Export a CSV from your bank, wallet or co-operative and bring it in through Imports. Every row is
          reviewed before anything reaches your ledger.
        </ThemedText>
        <Button label="Go to Imports" variant="secondary" onPress={() => router.push('/imports')} />
      </Card>

      {unavailable.length > 0 ? (
        <Card style={{ gap: spacing.sm }}>
          <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
            NOT AVAILABLE IN THIS BUILD
          </ThemedText>
          {unavailable.map((provider) => (
            <View key={provider.engine} style={{ gap: spacing.xxs }}>
              <Badge label={provider.engine.replace(/_/g, ' ')} tone="warning" />
              <ThemedText variant="caption" tone="muted">
                {provider.availability().reason}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
