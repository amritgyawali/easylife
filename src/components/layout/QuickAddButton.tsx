import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useCompactLayout';
import { layout, minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
import { useToday } from '@/hooks/useToday';
import { useQuickAdd } from '@/features/quick-add/api';

type QuickKind = 'task' | 'note';

interface QuickCapture {
  open: () => void;
}

const QuickAddContext = createContext<QuickCapture>({ open: () => {} });

/** Opens the quick-add sheet from anywhere in the shell (FAB, top bar, tab). */
export function useQuickCapture(): QuickCapture {
  return useContext(QuickAddContext);
}

/**
 * Capture-anywhere entry point for a task or a note, in two taps, without
 * navigating away from whatever you were doing.
 *
 * It writes through the durable offline path (`useQuickAdd`), so a capture on a
 * subway platform is saved instantly and synced later — the whole point of a
 * quick-add is that it must never fail because the network did.
 *
 * The sheet lives in a provider rather than inside the button because the two
 * form factors trigger it from different chrome: a floating action button on a
 * phone, a "New" button in the desktop top bar, where a FAB floating over a
 * 1600px window would be both odd and far from the pointer.
 */
export function QuickAddProvider({ children }: PropsWithChildren) {
  const theme = useTheme();
  const { today } = useToday();
  const { addTask, addNote } = useQuickAdd();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickKind>('task');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueToday, setDueToday] = useState(false);

  const value = useMemo<QuickCapture>(() => ({ open: () => setOpen(true) }), []);

  const close = () => {
    setOpen(false);
    setTitle('');
    setBody('');
    setDueToday(false);
    setKind('task');
  };

  const submit = () => {
    if (!title.trim()) return;
    if (kind === 'task') {
      addTask({ title, dueDate: dueToday ? today : null });
    } else {
      addNote({ title, content: body });
    }
    close();
  };

  return (
    <QuickAddContext.Provider value={value}>
      {children}

      <FormSheet
        visible={open}
        onClose={close}
        title="Quick add"
        subtitle="Saved on this device straight away, synced when you're online."
        footer={
          <>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" onPress={close} fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Add"
                icon="checkmark"
                onPress={submit}
                disabled={!title.trim()}
                fullWidth
              />
            </View>
          </>
        }
      >
        <OptionGroup
          variant="segmented"
          options={[
            { value: 'task', label: 'Task', icon: 'checkbox-outline' },
            { value: 'note', label: 'Note', icon: 'document-text-outline' },
          ]}
          value={kind}
          onChange={(value) => setKind(value as QuickKind)}
        />

        <TextField
          label={kind === 'task' ? 'What needs doing?' : 'Title'}
          value={title}
          onChangeText={setTitle}
          autoFocus
          size="lg"
          placeholder={kind === 'task' ? 'e.g. Pay electricity bill' : 'Note title'}
          onSubmitEditing={submit}
          returnKeyType="done"
        />

        {kind === 'task' ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dueToday }}
            accessibilityLabel="Due today"
            onPress={() => setDueToday((value) => !value)}
            style={(state) => {
              const { hovered, focused } = pressState(state);
              return [
                {
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  gap: spacing.sm,
                  minHeight: minTouchTarget,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: dueToday ? theme.colors.primary : theme.colors.border,
                  backgroundColor: dueToday
                    ? theme.colors.accentSurface
                    : hovered
                      ? theme.colors.surfaceHover
                      : theme.colors.surface,
                },
                transition(),
                clickable(),
                focusRing(theme.colors.focus, focused),
              ];
            }}
          >
            <Ionicons
              name={dueToday ? 'checkbox' : 'square-outline'}
              size={20}
              color={dueToday ? theme.colors.primary : theme.colors.textMuted}
            />
            <ThemedText variant="body" tone={dueToday ? 'primary' : 'default'}>
              Due today
            </ThemedText>
          </Pressable>
        ) : (
          <TextField
            label="Note"
            value={body}
            onChangeText={setBody}
            placeholder="Write something…"
            multiline
            helpText="Optional — you can fill this in later."
          />
        )}
      </FormSheet>
    </QuickAddContext.Provider>
  );
}

/**
 * The floating "＋" on phone layouts. Positioned clear of the tab bar and the
 * home indicator so it never covers the last row of a list.
 */
export function QuickAddButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { compact } = useLayout();
  const { open } = useQuickCapture();

  if (!compact) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick add a task or note"
      onPress={open}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            position: 'absolute' as const,
            right: spacing.lg,
            bottom: minTouchTarget + spacing.xl + insets.bottom,
            width: layout.fabSize,
            height: layout.fabSize,
            borderRadius: radius.full,
            backgroundColor: hovered ? theme.colors.primaryHover : theme.colors.primary,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            opacity: pressed ? 0.9 : 1,
            transform: pressed ? [{ scale: 0.94 }] : undefined,
            ...theme.elevation.lg,
          },
          transition(),
          clickable(),
          focusRing(theme.colors.focus, focused, 3),
        ];
      }}
    >
      <Ionicons name="add" size={28} color={theme.colors.primaryText} />
    </Pressable>
  );
}
