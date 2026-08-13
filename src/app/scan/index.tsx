import { useMemo, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { List, ListRow } from '@/components/ui/List';
import { InlineMessage } from '@/components/ui/InlineMessage';
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
  const theme = useTheme();
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
      width="wide"
      header={
        <ScreenHeader
          eyebrow="Records"
          title="Scan"
          subtitle="Turn a statement photo into transactions, or file a document away."
        />
      }
    >
      <Grid minColumnWidth={340} maxColumns={2}>
        <Card style={{ gap: spacing.md, height: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="scan-outline" size={22} color={theme.colors.primary} />
            <ThemedText variant="subtitle">Scan a statement</ThemedText>
          </View>
          <ThemedText variant="label" tone="muted">
            Photograph or choose a bank or wallet statement page. Text is read automatically and turned into a
            reviewable table — nothing reaches your ledger until you confirm each row.
          </ThemedText>
          <View style={{ flex: 1 }} />
          <Button label="Start a scan" icon="camera-outline" onPress={() => setWizardOpen(true)} />
        </Card>

        <Card style={{ gap: spacing.md, height: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="folder-outline" size={22} color={theme.colors.primary} />
            <ThemedText variant="subtitle">File a document</ThemedText>
          </View>
          <ThemedText variant="label" tone="muted">
            Receipts, invoices, IDs and certificates — stored privately, no extraction. Duplicate photos are
            recognised and never stored twice.
          </ThemedText>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {Platform.OS !== 'web' ? (
              <Button
                label="Take photo"
                icon="camera-outline"
                onPress={() => void captureDocument('camera')}
              />
            ) : null}
            <Button
              label="Choose photo"
              variant="secondary"
              icon="image-outline"
              onPress={() => void captureDocument('library')}
            />
            <Button
              label="Choose file"
              variant="secondary"
              icon="document-outline"
              onPress={() => void captureDocument('file')}
            />
          </View>
          {pickError ? <InlineMessage tone="negative" message={pickError} /> : null}
        </Card>
      </Grid>

      {recentScans.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader
            title="Recent"
            count={recentScans.length}
            action={
              <Button
                label="See all"
                variant="ghost"
                size="sm"
                icon="arrow-forward"
                iconPosition="trailing"
                onPress={() => router.push('/documents')}
              />
            }
          />
          <List>
            {recentScans.map((document) => (
              <ListRow
                key={document.id}
                icon="document-outline"
                title={document.title}
                subtitle={formatIsoDate(document.created_at.slice(0, 10))}
                meta={<Badge label={document.document_type.replace(/_/g, ' ')} />}
                trailing={
                  <IconButton
                    icon="open-outline"
                    accessibilityLabel={`Open ${document.title}`}
                    onPress={() => void openRecentScan(document)}
                  />
                }
              />
            ))}
          </List>
          {openError ? <InlineMessage tone="negative" message={openError} /> : null}
        </View>
      ) : null}

      <InlineMessage
        icon="bulb-outline"
        title="For best results"
        message="Flat angle, good light, and the whole table in frame. A blurry or angled photo is the most common reason a scan comes back unreadable — retaking it almost always fixes that."
      />

      <ImportWizardSheet visible={wizardOpen} onClose={() => setWizardOpen(false)} />
      <UploadSheet file={pickedFile} defaultDocumentType="receipt" onClose={() => setPickedFile(null)} />
    </Screen>
  );
}
