import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/forms/TextField';
import { SearchInput } from '@/components/forms/SearchInput';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import { formatIsoDate, type IsoDate } from '@/utils/date';
import type { DocumentType } from '@/types/database';
import {
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
  signedUrlFor,
  type DocumentRow,
  type PickedFile,
} from '@/features/documents/api';
import { useFilePicker } from '@/features/documents/use-file-picker';

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'bank_statement', label: 'Statement' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'identity', label: 'Identity' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

/** The document vault: private storage, deduplicated by file hash. */
export default function DocumentsScreen() {
  const { data: documents, isLoading, error, refetch, isRefetching } = useDocuments();
  const deleteDocument = useDeleteDocument();
  const { pickDocument, pickPhoto } = useFilePicker();

  const [query, setQuery] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!documents) return [];
    if (!needle) return documents;
    return documents.filter(
      (document) =>
        document.title.toLowerCase().includes(needle) ||
        (document.institution?.toLowerCase().includes(needle) ?? false) ||
        (document.notes?.toLowerCase().includes(needle) ?? false)
    );
  }, [documents, query]);

  async function handlePick(source: 'file' | 'camera' | 'library') {
    setPickError(null);
    try {
      const file = source === 'file' ? await pickDocument() : await pickPhoto(source === 'camera');
      if (file) setPickedFile(file);
    } catch (pickFailure) {
      setPickError(toUserMessage(pickFailure));
    }
  }

  async function openDocument(document: DocumentRow) {
    try {
      const url = await signedUrlFor(document);
      await Linking.openURL(url);
    } catch (openFailure) {
      setPickError(toUserMessage(openFailure));
    }
  }

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="Documents"
            subtitle="Stored privately. Identical files are recognised, never uploaded twice."
            action={<Button label="Add file" size="sm" onPress={() => void handlePick('file')} />}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {Platform.OS !== 'web' ? (
              <Button
                label="Camera"
                size="sm"
                variant="secondary"
                onPress={() => void handlePick('camera')}
              />
            ) : null}
            <Button label="Photo" size="sm" variant="secondary" onPress={() => void handlePick('library')} />
          </View>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search documents" />
        </>
      }
    >
      {pickError ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {pickError}
        </ThemedText>
      ) : null}

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : matching.length === 0 ? (
        <EmptyState
          title={query ? 'No matching documents' : 'Nothing stored yet'}
          description={
            query
              ? 'Try a different search.'
              : 'Keep statements, receipts and certificates here. A bank statement can then be imported into your ledger.'
          }
          actionLabel={query ? undefined : 'Add file'}
          onAction={query ? undefined : () => void handlePick('file')}
        />
      ) : (
        matching.map((document) => (
          <Card key={document.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <ThemedText variant="subtitle" numberOfLines={1}>
                  {document.title}
                </ThemedText>
                <ThemedText variant="caption" tone="muted">
                  {(document.file_size_bytes / 1024).toFixed(0)} KB
                  {document.institution ? ` · ${document.institution}` : ''}
                  {document.document_date ? ` · ${formatIsoDate(document.document_date)}` : ''}
                </ThemedText>
              </View>
              <IconButton
                icon="open-outline"
                accessibilityLabel={`Open ${document.title}`}
                onPress={() => void openDocument(document)}
              />
              <IconButton
                icon="trash-outline"
                accessibilityLabel={`Delete ${document.title}`}
                onPress={() => deleteDocument.mutate(document)}
              />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Badge label={document.document_type.replace(/_/g, ' ')} />
              {document.extraction_status ? (
                <Badge
                  label={document.extraction_status.replace(/_/g, ' ')}
                  tone={document.extraction_status === 'confirmed' ? 'positive' : 'warning'}
                />
              ) : null}
            </View>
          </Card>
        ))
      )}

      <UploadSheet file={pickedFile} onClose={() => setPickedFile(null)} />
    </Screen>
  );
}

function UploadSheet({ file, onClose }: { file: PickedFile | null; onClose: () => void }) {
  const { today } = useToday();
  const uploadDocument = useUploadDocument();

  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('bank_statement');
  const [institution, setInstitution] = useState('');
  const [documentDate, setDocumentDate] = useState<IsoDate | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setTitle(file.name);
    setDocumentType('bank_statement');
    setInstitution('');
    setDocumentDate(null);
    setDuplicateNotice(null);
  }, [file]);

  if (!file) return null;

  async function handleUpload() {
    if (!file) return;

    const result = await uploadDocument.mutateAsync({
      file,
      title,
      documentType,
      institution,
      documentDate,
    });

    if (result.wasDuplicate) {
      // Not an error: the file is already safely stored, and telling the user
      // that is more useful than silently closing as if something happened.
      setDuplicateNotice(`Already stored as "${result.document.title}" — nothing was uploaded again.`);
      return;
    }

    onClose();
  }

  return (
    <FormSheet
      visible
      title="Add to vault"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label={duplicateNotice ? 'Done' : 'Upload'}
            loading={uploadDocument.isPending}
            fullWidth
            onPress={duplicateNotice ? onClose : () => void handleUpload()}
          />
        </View>
      }
    >
      <ThemedText variant="caption" tone="muted">
        {file.name} · {(file.size / 1024).toFixed(0)} KB · {file.mimeType}
      </ThemedText>

      <TextField label="Title" value={title} onChangeText={setTitle} autoFocus />
      <OptionGroup
        label="Type"
        options={DOCUMENT_TYPE_OPTIONS}
        value={documentType}
        onChange={setDocumentType}
      />
      <TextField
        label="Institution"
        value={institution}
        onChangeText={setInstitution}
        placeholder="Optional — which bank or wallet"
      />
      <DateField label="Document date" value={documentDate} onChange={setDocumentDate} today={today} />

      {duplicateNotice ? (
        <ThemedText variant="body" tone="warning" accessibilityLiveRegion="polite">
          {duplicateNotice}
        </ThemedText>
      ) : null}

      {uploadDocument.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(uploadDocument.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
