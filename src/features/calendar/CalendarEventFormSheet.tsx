import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { DateField } from '@/components/forms/DateField';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import { toIsoDateInTimeZone, type IsoDate } from '@/utils/date';
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
  type CalendarEventRow,
} from '@/features/calendar/api';

export interface CalendarEventFormSheetProps {
  visible: boolean;
  onClose: () => void;
  event: CalendarEventRow | null;
  defaultDate?: IsoDate;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function CalendarEventFormSheet({
  visible,
  onClose,
  event,
  defaultDate,
}: CalendarEventFormSheetProps) {
  const { today, timeZone } = useToday();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<IsoDate>(today);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState('09:00');
  const [errors, setErrors] = useState<{ title?: string; time?: string }>({});

  useEffect(() => {
    if (!visible) return;
    const startsAt = event ? new Date(event.starts_at) : null;
    setTitle(event?.title ?? '');
    setLocation(event?.location ?? '');
    setDate(startsAt ? toIsoDateInTimeZone(startsAt, timeZone) : (defaultDate ?? today));
    setAllDay(event?.all_day ?? false);
    setTime(startsAt ? startsAt.toTimeString().slice(0, 5) : '09:00');
    setErrors({});
  }, [visible, event, defaultDate, today, timeZone]);

  const pending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;
  const error = createEvent.error ?? updateEvent.error ?? deleteEvent.error;

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (title.trim().length === 0) nextErrors.title = 'Give the event a name.';
    if (!allDay && !TIME_PATTERN.test(time)) nextErrors.time = 'Use a 24-hour time like 14:30.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const input = { title, location, date, time: allDay ? null : time };

    if (event) await updateEvent.mutateAsync({ id: event.id, ...input });
    else await createEvent.mutateAsync(input);

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={event ? 'Edit event' : 'New event'}
      onClose={onClose}
      footer={
        <>
          {event ? (
            <Button
              label="Delete"
              variant="danger"
              disabled={pending}
              onPress={async () => {
                await deleteEvent.mutateAsync(event.id);
                onClose();
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button label="Save" loading={pending} fullWidth onPress={() => void handleSave()} />
          </View>
        </>
      }
    >
      <TextField
        label="Event"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setErrors((current) => ({ ...current, title: undefined }));
        }}
        error={errors.title}
        placeholder="What's happening?"
        autoFocus
      />

      <DateField
        label="Date"
        value={date}
        onChange={(value) => setDate(value ?? today)}
        today={today}
        clearable={false}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Checkbox checked={allDay} onChange={setAllDay} accessibilityLabel="All-day event" />
        <ThemedText variant="body">All day</ThemedText>
      </View>

      {!allDay ? (
        <TextField
          label="Start time"
          value={time}
          onChangeText={(value) => {
            setTime(value);
            setErrors((current) => ({ ...current, time: undefined }));
          }}
          error={errors.time}
          placeholder="HH:MM"
          autoCapitalize="none"
        />
      ) : null}

      <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Optional" />

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
