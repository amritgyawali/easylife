import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { randomUUID, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import { STORAGE_BUCKETS } from '@/constants/app';
import { maxUploadMb } from '@/constants/env';
import type { Database, DocumentType } from '@/types/database';
import type { IsoDate } from '@/utils/date';

export type DocumentRow = Database['public']['Tables']['documents']['Row'];

export const documentKeys = {
  all: (userId: string) => ['documents', userId] as const,
  list: (userId: string) => ['documents', userId, 'list'] as const,
};

export function useDocuments() {
  const userId = useUserId();

  return useQuery({
    queryKey: documentKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(300)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

/**
 * Reads a picked file as raw bytes.
 *
 * Two paths because the platforms genuinely differ: on web the picker hands
 * back a blob URL that `fetch` can read directly, while on native the file
 * lives on disk and is read through expo-file-system as base64. Going through
 * `fetch` on native would depend on a Blob/FileReader polyfill that isn't
 * reliably present.
 */
export async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return base64ToBytes(base64);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Decodes a file's bytes as UTF-8 text, for statement parsing. */
export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * SHA-256 of the file's contents, used to spot a re-upload of the same file.
 *
 * Hashed from the bytes rather than the name or size so a renamed copy is
 * still recognised — `documents` has a unique constraint on
 * `(user_id, sha256_hash)`, and hitting it is the intended outcome rather
 * than an error to work around.
 */
export async function hashFile(bytes: Uint8Array): Promise<string> {
  // Hex rather than the raw bytes so the value is comparable in SQL.
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, hex);
}

export interface UploadDocumentInput {
  file: PickedFile;
  title: string;
  documentType: DocumentType;
  institution?: string | null;
  documentDate?: IsoDate | null;
  notes?: string | null;
}

export interface UploadedDocument {
  document: DocumentRow;
  /** True when an identical file was already in the vault. */
  wasDuplicate: boolean;
}

export function useUploadDocument() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<UploadedDocument> => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const limitMb = maxUploadMb();
      const maxBytes = limitMb * 1024 * 1024;
      if (input.file.size > maxBytes) {
        throw new AppError(
          'unsupported_document',
          `That file is ${(input.file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${limitMb} MB.`
        );
      }

      const bytes = await readFileBytes(input.file.uri);
      const sha256 = await hashFile(bytes);

      // Checked before uploading, so a re-upload costs no storage quota —
      // which matters on a free tier.
      const existing = unwrap(
        await supabase
          .from('documents')
          .select('*')
          .eq('user_id', owner)
          .eq('sha256_hash', sha256)
          .is('deleted_at', null)
          .limit(1)
      );

      if (existing.length > 0) {
        return { document: existing[0]!, wasDuplicate: true };
      }

      const documentId = randomUUID();
      const storagePath = `${owner}/${documentId}-${sanitiseFileName(input.file.name)}`;

      const upload = await supabase.storage
        .from(STORAGE_BUCKETS.documents)
        .upload(storagePath, bytes, { contentType: input.file.mimeType, upsert: false });

      if (upload.error) {
        throw new AppError('upload_failed', upload.error.message, upload.error);
      }

      const insert = await supabase.from('documents').insert({
        id: documentId,
        user_id: owner,
        title: input.title.trim() || input.file.name,
        document_type: input.documentType,
        institution: input.institution?.trim() || null,
        document_date: input.documentDate ?? null,
        notes: input.notes?.trim() || null,
        storage_bucket: STORAGE_BUCKETS.documents,
        storage_path: storagePath,
        mime_type: input.file.mimeType,
        file_size_bytes: input.file.size,
        sha256_hash: sha256,
      });

      if (insert.error) {
        // Don't leave an orphaned object burning storage quota with no row
        // pointing at it.
        await supabase.storage.from(STORAGE_BUCKETS.documents).remove([storagePath]);
        throw new AppError('upload_failed', insert.error.message, insert.error);
      }

      const created = unwrap(await supabase.from('documents').select('*').eq('id', documentId).single());

      return { document: created, wasDuplicate: false };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all(userId) }),
  });
}

/** Storage object keys must not carry path separators or exotic characters. */
function sanitiseFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(-80);
}

/**
 * A short-lived URL for viewing a private document.
 *
 * The bucket is private (see SECURITY.md), so there is no public URL —
 * every view goes through a signed link that expires.
 */
export async function signedUrlFor(document: DocumentRow, expiresInSeconds = 300): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, expiresInSeconds);

  if (error || !data) throw new AppError('not_found', error?.message ?? 'Could not open the document');
  return data.signedUrl;
}

/** Downloads a document's bytes, for re-parsing an already-uploaded statement. */
export async function downloadDocument(document: DocumentRow): Promise<Uint8Array> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(document.storage_bucket)
    .download(document.storage_path);

  if (error || !data) throw new AppError('not_found', error?.message ?? 'Could not download the document');
  return new Uint8Array(await data.arrayBuffer());
}

export function useDeleteDocument() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: DocumentRow) => {
      const supabase = getSupabaseClient();

      // Storage object first: a soft-deleted row with a live object would keep
      // consuming quota invisibly, whereas a missing object with a row still
      // present is recoverable information.
      await supabase.storage.from(document.storage_bucket).remove([document.storage_path]);

      unwrapVoid(
        await supabase
          .from('documents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', document.id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all(userId) }),
  });
}
