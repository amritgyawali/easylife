import { useMemo, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { toUserMessage } from '@/utils/errors';
import { formatIsoDate } from '@/utils/date';
import { useDocuments, signedUrlFor, type PickedFile } from '@/features/documents/api';
import { useFilePicker } from '@/features/documents/use-file-picker';
import { UploadSheet } from '@/features/documents/UploadSheet';
import { ImportWizardSheet } from '@/features/imports/ImportWizardSheet';

const RECENT_SCAN_COUNT = 5;

/**
 * Two distinct jobs live here, and keeping them visually separate matters:
 * turning a statement photo into reviewable transactions (OCR, via
 * `ImportWizardSheet`) vs. simply filing a document away (receipt, ID,
 * certificate — no extraction, just storage). Conflating them is how a
 * scanned receipt used to end up silently posted nowhere, and how a
 * statement photo used to have no path to the ledger at all.
 */
export default function ScanScreen() {
  const router = useRouter();
  const { pickPhoto, pickDocument } = useFilePicker();
  const { data: documents } = useDocuments();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const recentScans = useMemo(() => (documents ?? []).slice(0, RECENT_SCAN_COUNT), [documents]);

  async function captureDocument(source: 'camera' | 'library' | 'file') {
    setPickError(null);
    try {
      const file = source === 'file' ? await pickDocument() : await pickPhoto(source === 'camera');
      if (file) setPickedFile(file);
    } catch (failure) {
      setPickError(toUserMessage(failure));
    }
  }

  async function openRecentScan(document: (typeof recentScans)[number]) {
    setOpenError(null);
    try {
      const url = await signedUrlFor(document);
      await Linking.openURL(url);
    } catch (failure) {
      setOpenError(toUserMessage(failure));
    }
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title="Scan"
          subtitle="Turn a statement photo into transactions, or file a document away."
        />
      }
    >
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="subtitle">Scan a statement</ThemedText>
        <ThemedText variant="body" tone="muted">
          Photograph or choose a bank or wallet statement page. Text is read automatically and turned into a
          reviewable table — nothing reaches your ledger until you confirm each row.
        </ThemedText>
        <Button label="Start" onPress={() => setWizardOpen(true)} />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="subtitle">File a document</ThemedText>
        <ThemedText variant="body" tone="muted">
          Receipts, invoices, IDs and certificates — stored privately, no extraction. Duplicate photos are
          recognised and never stored twice.
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {Platform.OS !== 'web' ? (
            <Button label="Take photo" onPress={() => void captureDocument('camera')} />
          ) : null}
          <Button label="Choose photo" variant="secondary" onPress={() => void captureDocument('library')} />
          <Button label="Choose file" variant="secondary" onPress={() => void captureDocument('file')} />
        </View>
        {pickError ? (
          <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
            {pickError}
          </ThemedText>
        ) : null}
      </Card>

      {recentScans.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText
              variant="label"
              tone="muted"
              weight="semibold"
              accessibilityRole="header"
              style={{ flex: 1 }}
            >
              RECENT
            </ThemedText>
            <Button label="See all" variant="ghost" size="sm" onPress={() => router.push('/documents')} />
          </View>
          <Card padded={false}>
            {recentScans.map((document) => (
              <View
                key={document.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <ThemedText variant="body" numberOfLines={1}>
                    {document.title}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    <Badge label={document.document_type.replace(/_/g, ' ')} />
                    <ThemedText variant="caption" tone="muted">
                      {formatIsoDate(document.created_at.slice(0, 10))}
                    </ThemedText>
                  </View>
                </View>
                <IconButton
                  icon="open-outline"
                  accessibilityLabel={`Open ${document.title}`}
                  onPress={() => void openRecentScan(document)}
                />
              </View>
            ))}
          </Card>
          {openError ? (
            <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
              {openError}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <Card style={{ gap: spacing.xs }}>
        <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
          FOR BEST RESULTS
        </ThemedText>
        <ThemedText variant="caption" tone="muted">
          Flat angle, good light, and the whole table in frame. A blurry or angled photo is the most common
          reason a scan comes back unreadable — retaking it almost always fixes that.
        </ThemedText>
      </Card>

      <ImportWizardSheet visible={wizardOpen} onClose={() => setWizardOpen(false)} />
      <UploadSheet file={pickedFile} defaultDocumentType="receipt" onClose={() => setPickedFile(null)} />
    </Screen>
  );
}
