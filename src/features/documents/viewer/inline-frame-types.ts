import type { ReactNode } from 'react';

/**
 * Shared contract for the two `InlineFrame` implementations (web renders the
 * file in an embedded frame; native renders the fallback). It lives in its own
 * module so neither platform file has to import the other — a `.web.tsx`
 * importing its own module specifier would resolve back to itself.
 */
export interface InlineFrameProps {
  /** A URL the platform can render on its own (signed link or object URL). */
  url: string;
  /** Accessible name for the embedded frame. */
  title: string;
  /** Shown instead of the frame wherever inline embedding isn't available. */
  fallback: ReactNode;
}
