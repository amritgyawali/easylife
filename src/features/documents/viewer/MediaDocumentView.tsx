import type { ReactNode } from 'react';

export interface MediaDocumentViewProps {
  url: string;
  title: string;
  /** 'audio' renders a compact player; 'video' fills the pane. */
  media: 'audio' | 'video';
  /** Shown where the platform can't play media in place. */
  fallback: ReactNode;
}

/**
 * Native build: playback needs `expo-av`/`expo-video`, a dependency this
 * project doesn't carry for a capability the phone's own player already has —
 * so a recording attached to a document opens in the system player, and the
 * in-page player stays a web feature.
 */
export function MediaDocumentView({ fallback }: MediaDocumentViewProps) {
  return <>{fallback}</>;
}
