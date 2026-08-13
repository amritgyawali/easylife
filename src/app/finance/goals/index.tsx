import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckboxField } from '@/components/forms/CheckboxField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { FormActions, FormRow, FormSheet } from '@/components/ui/FormSheet';
import { FormError } from '@/components/ui/InlineMessage';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { useToday } from '@/hooks/useToday';
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
      width="wide"
      header={
        <ScreenHeader
          eyebrow="Money"
          title="Savings goals"
          subtitle="Progress is the sum of what you've put in, less what you've taken out."
          action={<Button label="New goal" size="sm" icon="add" onPress={() => setFormOpen(true)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : goals.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          title="No goals yet"
          description="Set something aside for — an emergency fund, a trip, a deposit."
          actionLabel="New goal"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <Grid minColumnWidth={340} maxColumns={2}>
          {goals.map(({ goal, savedMinor, progress }) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              savedMinor={savedMinor}
              progress={progress}
              onRecord={() => setEventGoal(goal)}
              onArchive={() => archiveGoal.mutate(goal.id)}
            />
          ))}
        </Grid>
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
  const remaining = Math.max(0, goal.target_amount_minor - savedMinor);
  const percent = Math.round(progress * 100);

  return (
    <Card style={{ gap: spacing.md, flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <ThemedText variant="subtitle" numberOfLines={2}>
            {goal.name}
          </ThemedText>
          <ThemedText variant="caption" tone="muted" numeric>
            {formatMoney(savedMinor, goal.currency)} of {formatMoney(goal.target_amount_minor, goal.currency)}
          </ThemedText>
        </View>
        <ThemedText variant="title" tone={percent >= 100 ? 'positive' : 'default'} numeric>
          {percent}%
        </ThemedText>
        <IconButton icon="archive-outline" accessibilityLabel={`Archive ${goal.name}`} onPress={onArchive} />
      </View>

      <ProgressBar
        value={progress}
        tone={percent >= 100 ? 'positive' : 'primary'}
        accessibilityLabel={`${goal.name}: ${percent} percent saved`}
      />

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' }}>
        {goal.is_emergency_fund ? <Badge label="Emergency fund" tone="warning" /> : null}
        {goal.target_date ? <Badge label={`By ${formatIsoDate(goal.target_date)}`} /> : null}
        <Badge
          label={remaining === 0 ? 'Reached' : `${formatMoney(remaining, goal.currency)} to go`}
          tone={remaining === 0 ? 'positive' : 'neutral'}
        />
        <View style={{ flex: 1 }} />
        <Button label="Add money" size="sm" variant="secondary" icon="add" onPress={onRecord} />
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
      subtitle="Something to put money aside for."
      onClose={onClose}
      footer={
        <FormActions
          pending={createGoal.isPending}
          onSave={() => void handleSave()}
          saveLabel="Create goal"
        />
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
        required
        placeholder="e.g. Emergency fund"
        autoFocus
        size="lg"
      />
      <FormRow>
        <MoneyField
          label="Target"
          required
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
      </FormRow>
      <DateField label="Target date" value={targetDate} onChange={setTargetDate} today={today} />

      <CheckboxField
        checked={isEmergencyFund}
        onChange={setIsEmergencyFund}
        label="This is my emergency fund"
        description="Highlighted separately so you can see your safety net at a glance."
      />

      <FormError error={createGoal.error} />
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
      subtitle="Record money moving in or out of this goal."
      onClose={onClose}
      footer={<FormActions pending={recordEvent.isPending} onSave={() => void handleSave()} />}
    >
      <OptionGroup
        variant="segmented"
        options={[
          { value: 'contribution', label: 'Put in', icon: 'arrow-down' },
          { value: 'withdrawal', label: 'Take out', icon: 'arrow-up' },
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

      <FormError error={recordEvent.error} />
    </FormSheet>
  );
}
