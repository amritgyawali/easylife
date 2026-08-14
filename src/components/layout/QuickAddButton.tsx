import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useHover } from '@/hooks/useHover';
import { elevation, minTouchTarget, radius, spacing, transition } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/forms/TextField';
import { SegmentedControl } from '@/components/forms/SegmentedControl';
import { useToday } from '@/hooks/useToday';
import { useQuickAdd } from '@/features/quick-add/api';

type QuickKind = 'task' | 'note';

/**
 * A floating "＋" available on every screen, for capturing a task or note in
 * two taps without navigating away from whatever you were doing.
 *
 * It writes through the durable offline path (`useQuickAdd`), so a capture on a
 * subway platform is saved instantly and synced later — the whole point of a
 * quick-add is that it must never fail because the network did.
 */
export function QuickAddButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const { hovered, hoverProps } = useHover();
  const { today } = useToday();
  const { addTask, addNote } = useQuickAdd();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickKind>('task');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueToday, setDueToday] = useState(false);

  const reset = () => {
    setTitle('');
    setBody('');
    setDueToday(false);
    setKind('task');
  };

  const close = () => {
    setOpen(false);
    reset();
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

  // Clear the mobile tab bar; sit in the normal margin on desktop.
  const bottom = (compact ? minTouchTarget + spacing.xl : spacing.xl) + insets.bottom;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick add a task or note"
        onPress={() => setOpen(true)}
        {...hoverProps}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: compact ? spacing.lg : spacing.xl,
            bottom,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            height: 56,
            // Grows into a labelled pill on desktop, where there is room for
            // it and no bottom bar competing for attention.
            paddingHorizontal: compact ? 0 : spacing.lg,
            width: compact ? 56 : undefined,
            borderRadius: radius.full,
            backgroundColor: hovered ? theme.colors.primaryHover : theme.colors.primary,
            alignSelf: 'flex-start',
            justifyContent: 'center',
            transform: pressed ? [{ scale: 0.94 }] : undefined,
          },
          elevation('lg', theme.mode),
          transition(),
        ]}
      >
        <Ionicons name="add" size={compact ? 30 : 22} color={theme.colors.primaryText} />
        {compact ? null : (
          <ThemedText variant="label" weight="semibold" style={{ color: theme.colors.primaryText }}>
            Quick add
          </ThemedText>
        )}
      </Pressable>

      <FormSheet
        visible={open}
        onClose={close}
        title="Quick add"
        subtitle="Saved on this device first, synced when you're back online."
        footer={
          <>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" fullWidth onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Add" fullWidth onPress={submit} disabled={!title.trim()} />
            </View>
          </>
        }
      >
        <SegmentedControl
          options={[
            { value: 'task', label: 'Task' },
            { value: 'note', label: 'Note' },
          ]}
          value={kind}
          onChange={setKind}
          fullWidth
        />

        <TextField
          label={kind === 'task' ? 'What needs doing?' : 'Title'}
          value={title}
          onChangeText={setTitle}
          autoFocus
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
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget }}
          >
            {/* The whole row is the target; the box itself must not also
                handle the press or a tap on it would toggle twice. */}
            <View pointerEvents="none">
              <Checkbox checked={dueToday} onChange={setDueToday} accessibilityLabel="Due today" />
            </View>
            <ThemedText variant="body">Due today</ThemedText>
          </Pressable>
        ) : (
          <TextField
            label="Note"
            helpText="Optional — you can flesh it out later."
            value={body}
            onChangeText={setBody}
            placeholder="Write something…"
            multiline
          />
        )}
      </FormSheet>
    </>
  );
}
