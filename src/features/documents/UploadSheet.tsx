import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import type { IsoDate } from '@/utils/date';
import type { DocumentType } from '@/types/database';
import { useUploadDocument, type PickedFile } from '@/features/documents/api';

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'bank_statement', label: 'Statement' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'identity', label: 'Identity' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

export interface UploadSheetProps {
  file: PickedFile | null;
  /** Preselects the type so a Scan-screen photo lands as "Receipt" rather than the generic default. */
  defaultDocumentType?: DocumentType;
  onClose: () => void;
}

/**
 * Confirms title/type/institution/date before a picked file lands in the
 * vault. Shared by the Documents screen (pick then review) and the Scan
 * screen (capture then review), so a file taken from either place gets the
 * same metadata and duplicate-detection behaviour.
 */
export function UploadSheet({ file, defaultDocumentType = 'bank_statement', onClose }: UploadSheetProps) {
  const { today } = useToday();
  const uploadDocument = useUploadDocument();

  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>(defaultDocumentType);
  const [institution, setInstitution] = useState('');
  const [documentDate, setDocumentDate] = useState<IsoDate | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setTitle(file.name);
    setDocumentType(defaultDocumentType);
    setInstitution('');
    setDocumentDate(null);
    setDuplicateNotice(null);
  }, [file, defaultDocumentType]);

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
