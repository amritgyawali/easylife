import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import { formatIsoDate, type IsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import type { GoalEventType } from '@/types/database';
import {
  useArchiveGoal,
  useCreateGoal,
  useGoalsWithProgress,
  useRecordGoalEvent,
  type SavingsGoalRow,
} from '@/features/goals/api';

export default function GoalsScreen() {
  const { data: goals, isLoading, error, refetch, isRefetching } = useGoalsWithProgress();
  const archiveGoal = useArchiveGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [eventGoal, setEventGoal] = useState<SavingsGoalRow | null>(null);

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Savings goals"
          subtitle="Progress is the sum of what you've put in, less what you've taken out."
          action={<Button label="New goal" size="sm" onPress={() => setFormOpen(true)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Set something aside for — an emergency fund, a trip, a deposit."
          actionLabel="New goal"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        goals.map(({ goal, savedMinor, progress }) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            savedMinor={savedMinor}
            progress={progress}
            onRecord={() => setEventGoal(goal)}
            onArchive={() => archiveGoal.mutate(goal.id)}
          />
        ))
      )}

      <GoalFormSheet visible={formOpen} onClose={() => setFormOpen(false)} />
      <GoalEventSheet visible={eventGoal !== null} goal={eventGoal} onClose={() => setEventGoal(null)} />
    </Screen>
  );
}

function GoalCard({
  goal,
  savedMinor,
  progress,
  onRecord,
  onArchive,
}: {
  goal: SavingsGoalRow;
  savedMinor: number;
  progress: number;
  onRecord: () => void;
  onArchive: () => void;
}) {
  const theme = useTheme();
  const remaining = Math.max(0, goal.target_amount_minor - savedMinor);
  const percent = Math.round(progress * 100);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <ThemedText variant="subtitle">{goal.name}</ThemedText>
          <ThemedText variant="caption" tone="muted">
            {formatMoney(savedMinor, goal.currency)} of {formatMoney(goal.target_amount_minor, goal.currency)}
          </ThemedText>
        </View>
        <ThemedText variant="title" tone={percent >= 100 ? 'positive' : 'default'}>
          {percent}%
        </ThemedText>
        <IconButton icon="archive-outline" accessibilityLabel={`Archive ${goal.name}`} onPress={onArchive} />
      </View>

      <View
        accessible
        accessibilityLabel={`${goal.name}: ${percent} percent saved`}
        style={{ height: 8, borderRadius: radius.full, backgroundColor: theme.colors.surfaceAlt }}
      >
        <View
          style={{
            height: 8,
            width: `${Math.max(percent, 1)}%`,
            borderRadius: radius.full,
            backgroundColor: percent >= 100 ? theme.colors.positive : theme.colors.primary,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' }}>
        {goal.is_emergency_fund ? <Badge label="Emergency fund" tone="warning" /> : null}
        {goal.target_date ? <Badge label={`By ${formatIsoDate(goal.target_date)}`} /> : null}
        <Badge
          label={remaining === 0 ? 'Reached' : `${formatMoney(remaining, goal.currency)} to go`}
          tone={remaining === 0 ? 'positive' : 'neutral'}
        />
        <View style={{ flex: 1 }} />
        <Button label="Add money" size="sm" variant="ghost" onPress={onRecord} />
      </View>
    </Card>
  );
}

function GoalFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { today } = useToday();
  const createGoal = useCreateGoal();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [targetDate, setTargetDate] = useState<IsoDate | null>(null);
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

  useEffect(() => {
    if (!visible) return;
    setName('');
    setTargetAmount('');
    setCurrency(SUPPORTED_CURRENCIES[0]);
    setTargetDate(null);
    setIsEmergencyFund(false);
    setErrors({});
  }, [visible]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (name.trim().length === 0) nextErrors.name = 'Give the goal a name.';
    if (targetAmount.trim() === '' || Number(targetAmount) <= 0) nextErrors.amount = 'Enter a target.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await createGoal.mutateAsync({ name, targetAmount, currency, targetDate, isEmergencyFund });
    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title="New savings goal"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={createGoal.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <TextField
        label="Goal"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setErrors((current) => ({ ...current, name: undefined }));
        }}
        error={errors.name}
        placeholder="e.g. Emergency fund"
        autoFocus
      />
      <MoneyField
        label="Target"
        value={targetAmount}
        onChangeText={(value) => {
          setTargetAmount(value);
          setErrors((current) => ({ ...current, amount: undefined }));
        }}
        currency={currency}
        error={errors.amount}
      />
      <OptionGroup
        label="Currency"
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={currency}
        onChange={setCurrency}
      />
      <DateField label="Target date" value={targetDate} onChange={setTargetDate} today={today} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Checkbox
          checked={isEmergencyFund}
          onChange={setIsEmergencyFund}
          accessibilityLabel="This is my emergency fund"
        />
        <ThemedText variant="body">This is my emergency fund</ThemedText>
      </View>

      {createGoal.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(createGoal.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}

function GoalEventSheet({
  visible,
  goal,
  onClose,
}: {
  visible: boolean;
  goal: SavingsGoalRow | null;
  onClose: () => void;
}) {
  const { today } = useToday();
  const recordEvent = useRecordGoalEvent();

  const [eventType, setEventType] = useState<GoalEventType>('contribution');
  const [amount, setAmount] = useState('');
  const [eventDate, setEventDate] = useState<IsoDate>(today);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEventType('contribution');
    setAmount('');
    setEventDate(today);
    setAmountError(null);
  }, [visible, today]);

  if (!goal) return null;

  async function handleSave() {
    if (!goal) return;

    if (amount.trim() === '' || Number(amount) <= 0) {
      setAmountError('Enter an amount.');
      return;
    }

    await recordEvent.mutateAsync({
      goalId: goal.id,
      currency: goal.currency,
      eventType,
      amount,
      eventDate,
    });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={goal.name}
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={recordEvent.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <OptionGroup
        options={[
          { value: 'contribution', label: 'Put in' },
          { value: 'withdrawal', label: 'Take out' },
        ]}
        value={eventType}
        onChange={setEventType}
      />
      <MoneyField
        label="Amount"
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          if (amountError) setAmountError(null);
        }}
        currency={goal.currency}
        error={amountError}
        autoFocus
      />
      <DateField
        label="Date"
        value={eventDate}
        onChange={(value) => setEventDate(value ?? today)}
        today={today}
        clearable={false}
      />

      {recordEvent.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(recordEvent.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
