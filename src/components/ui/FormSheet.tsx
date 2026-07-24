import type { PropsWithChildren } from 'react';

import { BottomSheet } from '@/components/ui/BottomSheet';

export interface FormSheetProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Action row pinned below the scrollable body, e.g. Save / Cancel. */
  footer?: React.ReactNode;
}

/**
 * Modal container for every create/edit form in the app.
 *
 * The modal mechanics — keyboard-aware sizing, overflow clipping, safe-area
 * insets — live in `BottomSheet`, which the More menu shares. This stays a
 * named component because "form sheet" is what feature code means, and because
 * it fixes the gutters forms want rather than leaving that to each call site.
 */
export function FormSheet({ visible, title, onClose, footer, children }: FormSheetProps) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose} footer={footer} body="padded">
      {children}
    </BottomSheet>
  );
}
