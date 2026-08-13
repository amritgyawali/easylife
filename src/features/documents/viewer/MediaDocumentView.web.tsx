import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import type { MediaDocumentViewProps } from '@/features/documents/viewer/MediaDocumentView';

/**
 * Web build: a voice memo or a screen recording plays in the page, from the
 * same private link the rest of the reader uses — nothing is downloaded, and
 * the browser handles decoding.
 */
export function MediaDocumentView({ url, title, media }: MediaDocumentViewProps) {
  if (media === 'audio') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <audio src={url} controls aria-label={title} style={{ width: '100%', maxWidth: 520 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <video
        src={url}
        controls
        playsInline
        aria-label={title}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </View>
  );
}
