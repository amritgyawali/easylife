import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { InlineFrameProps } from '@/features/documents/viewer/inline-frame-types';

/**
 * True for browsers whose PDF plugin doesn't work inside a frame.
 *
 * iOS (and iPadOS, which reports itself as a Mac with a touchscreen) renders
 * only the first page of a framed PDF, with no way to scroll to page two —
 * a broken-looking document rather than a missing feature. Those browsers get
 * the fallback, which opens the same object URL as a full page where WebKit's
 * own viewer works properly.
 */
function supportsFramedPdf(): boolean {
  if (typeof navigator === 'undefined') return true;

  const ua = navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return !isIosDevice && !isIpadOs;
}

/**
 * Web build: the file is displayed by the browser itself, in the page.
 *
 * The URL is either a short-lived signed link or an object URL for a file
 * that never left the device, so reading a document costs no download and
 * leaves nothing on disk.
 */
export function InlineFrame({ url, title, fallback }: InlineFrameProps) {
  // Resolved after mount so the server-rendered markup and the first client
  // render agree (the static web export renders this file in Node).
  const [framed, setFramed] = useState(true);

  useEffect(() => setFramed(supportsFramedPdf()), []);

  if (!framed) return <>{fallback}</>;

  return (
    <View style={{ flex: 1, minHeight: 240 }}>
      <iframe
        src={`${url}#view=FitH`}
        title={title}
        // `border: 0` rather than the attribute: the attribute is ignored by
        // the CSS reset the web export ships.
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </View>
  );
}
