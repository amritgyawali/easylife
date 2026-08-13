import { useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { AppError } from '@/utils/errors';
import type { PickedFile } from '@/features/documents/api';

/**
 * File selection, normalised into one shape across the two Expo pickers.
 *
 * The document picker and image picker return quite different result objects,
 * and both differ again on web; funnelling them through `PickedFile` here
 * keeps that mess out of the screens and out of the upload path.
 */
/**
 * File types the vault offers by default — everything the Reader can open in
 * the app, which is a superset of what the import pipeline can parse.
 *
 * Kept as a list rather than `*​/*` so the picker opens on the useful files;
 * the Reader passes `anyType` when the user explicitly wants anything.
 */
export const IMPORTABLE_MIME_TYPES = [
  'text/*',
  'application/pdf',
  'image/*',
  'audio/*',
  'video/*',
  'application/json',
  'application/rtf',
  'application/zip',
  'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
];

export interface PickDocumentOptions {
  /**
   * Accepts any file rather than only the importable types. The reader uses
   * this: it can show far more than the import pipeline can parse, and a
   * picker that hides a file the app could have displayed is worse than one
   * that occasionally offers a preview it can't render.
   */
  anyType?: boolean;
}

export function useFilePicker() {
  const pickDocument = useCallback(async (options?: PickDocumentOptions): Promise<PickedFile | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: options?.anyType ? '*/*' : IMPORTABLE_MIME_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    if (!asset) return null;

    return {
      uri: asset.uri,
      name: asset.name,
      // The picker leaves this undefined for extensions it doesn't know;
      // guessing from the name is better than uploading with no content type.
      mimeType: asset.mimeType ?? mimeFromName(asset.name),
      size: asset.size ?? 0,
    };
  }, []);

  const pickPhoto = useCallback(async (fromCamera: boolean): Promise<PickedFile | null> => {
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new AppError('validation_failed', 'Camera access is needed to scan a document.');
      }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, exif: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          exif: false,
        });

    if (result.canceled) return null;

    const asset = result.assets[0];
    if (!asset) return null;

    return {
      uri: asset.uri,
      name: asset.fileName ?? `scan-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    };
  }, []);

  return { pickDocument, pickPhoto };
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  txt: 'text/plain',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function mimeFromName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME_TYPES[extension] ?? 'application/octet-stream';
}
