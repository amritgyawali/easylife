import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import type { FileDropZoneProps } from '@/features/documents/viewer/FileDropZone';

/** True when the drag actually carries files, rather than selected text or a link. */
function carriesFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  return types ? Array.from(types).includes('Files') : false;
}

/**
 * Drag a file anywhere onto the reader to open it.
 *
 * The listeners are attached to the DOM node imperatively because
 * react-native-web's `View` doesn't forward drag props — and this is the one
 * place in the app where that trade-off is worth it, since dragging a
 * statement out of a downloads folder is how people open a document on a
 * desktop.
 *
 * `dragenter`/`dragleave` fire for every child element the pointer crosses,
 * so the depth counter is what stops the overlay flickering as the file moves
 * across the page.
 */
export function FileDropZone({ onFileDropped, children }: FileDropZoneProps) {
  const theme = useTheme();
  const containerRef = useRef<View | null>(null);
  const [dragging, setDragging] = useState(false);

  // Keeps the effect from re-subscribing when the parent re-creates its handler.
  const handlerRef = useRef(onFileDropped);
  handlerRef.current = onFileDropped;

  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return undefined;

    let depth = 0;

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      // Without this the browser navigates away to the dropped file.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);

      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      handlerRef.current({
        // Revoked by `releaseReaderSource` once the file is closed.
        uri: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      });
    };

    node.addEventListener('dragenter', onDragEnter);
    node.addEventListener('dragover', onDragOver);
    node.addEventListener('dragleave', onDragLeave);
    node.addEventListener('drop', onDrop);

    return () => {
      node.removeEventListener('dragenter', onDragEnter);
      node.removeEventListener('dragover', onDragOver);
      node.removeEventListener('dragleave', onDragLeave);
      node.removeEventListener('drop', onDrop);
    };
  }, []);

  return (
    <View ref={containerRef} style={{ flex: 1 }}>
      {children}

      {dragging ? (
        <View
          // Pointer events off: the overlay must never swallow the drop event
          // it exists to announce.
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: spacing.sm,
            left: spacing.sm,
            right: spacing.sm,
            bottom: spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.accentSurface,
          }}
        >
          <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.primary} />
          <ThemedText variant="subtitle" tone="primary">
            Drop to read it here
          </ThemedText>
          <ThemedText variant="caption" tone="muted">
            Nothing is uploaded until you save it to the vault.
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}
