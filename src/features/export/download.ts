import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { AppError } from '@/utils/errors';

/**
 * Saves a text payload (a CSV or a JSON backup) to a file the user keeps.
 *
 * The two platforms genuinely differ, so this is the one place that branches:
 * on web a Blob is streamed to an anchor click (a real browser download); on
 * native the string is written to the cache directory and handed to the OS
 * share sheet, which is how a phone lets the user file it into Files, email,
 * Drive, etc. Everything above this (serialising the data) is pure and shared.
 */

export type ExportMimeType = 'text/csv' | 'application/json';

export interface SaveTextFileInput {
  filename: string;
  content: string;
  mimeType: ExportMimeType;
}

export async function saveTextFile({ filename, content, mimeType }: SaveTextFileInput): Promise<void> {
  if (Platform.OS === 'web') {
    saveOnWeb(filename, content, mimeType);
    return;
  }
  await saveOnNative(filename, content, mimeType);
}

function saveOnWeb(filename: string, content: string, mimeType: ExportMimeType): void {
  // A BOM keeps Excel from mangling UTF-8 (e.g. Devanagari/₹) in a CSV.
  const blob = new Blob([mimeType === 'text/csv' ? '﻿' + content : content], {
    type: `${mimeType};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the click a tick to start before revoking the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function saveOnNative(filename: string, content: string, mimeType: ExportMimeType): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new AppError('unknown', 'No writable location is available to save the export.');
  }

  const fileUri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: 'utf8' });

  if (!(await Sharing.isAvailableAsync())) {
    throw new AppError('unknown', 'Sharing is not available on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: 'Save or share your export',
    UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
  });
}

/** A filesystem-safe, timestamped filename, e.g. `amrit-lifeos-transactions-2026-07-23.csv`. */
export function exportFilename(base: string, extension: 'csv' | 'json', on: Date = new Date()): string {
  const date = on.toISOString().slice(0, 10);
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeBase}-${date}.${extension}`;
}
