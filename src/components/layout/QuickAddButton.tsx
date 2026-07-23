import { useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { DESKTOP_BREAKPOINT } from '@/constants/navigation';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { OptionGroup } from '@/components/forms/OptionGroup';
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
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
  const bottom = (isDesktop ? spacing.xl : minTouchTarget + spacing.xl) + insets.bottom;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick add"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: spacing.lg,
          bottom,
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        })}
      >
        <Ionicons name="add" size={30} color={theme.colors.primaryText} />
      </Pressable>

      <FormSheet
        visible={open}
        onClose={close}
        title="Quick add"
        footer={
          <>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="ghost" onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Add" onPress={submit} disabled={!title.trim()} />
            </View>
          </>
        }
      >
        <OptionGroup
          options={[
            { value: 'task', label: 'Task' },
            { value: 'note', label: 'Note' },
          ]}
          value={kind}
          onChange={(value) => setKind(value as QuickKind)}
        />

        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            {kind === 'task' ? 'What needs doing?' : 'Title'}
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            placeholder={kind === 'task' ? 'e.g. Pay electricity bill' : 'Note title'}
            placeholderTextColor={theme.colors.textMuted}
            onSubmitEditing={submit}
            returnKeyType="done"
            style={inputStyle(theme)}
          />
        </View>

        {kind === 'task' ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dueToday }}
            onPress={() => setDueToday((value) => !value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <Ionicons
              name={dueToday ? 'checkbox' : 'square-outline'}
              size={22}
              color={dueToday ? theme.colors.primary : theme.colors.textMuted}
            />
            <ThemedText variant="body">Due today</ThemedText>
          </Pressable>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="label" tone="muted">
              Note (optional)
            </ThemedText>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write something…"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={[inputStyle(theme), { minHeight: 96, textAlignVertical: 'top' }]}
            />
          </View>
        )}
      </FormSheet>
    </>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>) {
  return {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: theme.colors.text,
  };
}
