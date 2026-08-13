import { Children, type PropsWithChildren, type ReactNode } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/useCompactLayout';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';

export interface FormSheetProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Action row pinned below the scrollable body, e.g. Save / Cancel. */
  footer?: ReactNode;
  /** `lg` for forms with side-by-side fields (imports, transactions). */
  size?: 'md' | 'lg';
}

/**
 * Modal container for every create/edit form in the app.
 *
 * The modal mechanics — keyboard-aware sizing, overflow clipping, safe-area
 * insets, phone-sheet vs desktop-dialog presentation — live in `BottomSheet`,
 * which the More menu shares. This stays a named component because "form
 * sheet" is what feature code means, and because it fixes the gutters forms
 * want rather than leaving that to each call site.
 */
export function FormSheet({ visible, title, subtitle, onClose, footer, size, children }: FormSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={footer}
      body="padded"
      size={size}
    >
      {children}
    </BottomSheet>
  );
}

/**
 * Two fields side by side once there is room for them, stacked on a phone.
 *
 * Form sheets on a laptop were previously a single 560px column of full-width
 * inputs, which makes short values (a date, a currency, an amount) look like
 * they are asking for a paragraph and pushes the Save button off-screen.
 */
export function FormRow({ children }: { children: ReactNode }) {
  const { compact } = useLayout();
  // Conditional fields ({cond ? <Field/> : null}) arrive as null entries; they
  // would otherwise each claim an equal, empty column.
  const fields = Children.toArray(children).filter(Boolean);

  if (compact || fields.length < 2) {
    return <View style={{ gap: spacing.md }}>{fields}</View>;
  }

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      {fields.map((child, index) => (
        <View key={index} style={{ flex: 1, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Groups related fields under a quiet heading inside a long form. */
export function FormSection({ children }: { children: ReactNode }) {
  return <View style={{ gap: spacing.md }}>{children}</View>;
}

export interface FormActionsProps {
  onSave: () => void;
  saveLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
}

/**
 * The standard footer for a form sheet: destructive action on the left, the
 * commit action filling the rest.
 *
 * Every sheet in the app assembled this by hand, and they disagreed about
 * button order, widths and whether Delete was even reachable on a phone —
 * where a "Delete" and a "Save" sharing one row each ended up too narrow to
 * read. Here Delete keeps only the width its label needs, so Save always has
 * room, and both keep the full 44px height.
 */
export function FormActions({
  onSave,
  saveLabel = 'Save',
  pending = false,
  disabled = false,
  onDelete,
  deleteLabel = 'Delete',
}: FormActionsProps) {
  return (
    <>
      {onDelete ? (
        <Button
          label={deleteLabel}
          variant="danger"
          icon="trash-outline"
          disabled={pending}
          onPress={onDelete}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Button
          label={saveLabel}
          loading={pending}
          disabled={disabled}
          fullWidth
          onPress={onSave}
        />
      </View>
    </>
  );
}
