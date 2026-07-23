import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import { formatMoney, fromMinorUnits } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import type { BudgetPeriod } from '@/types/database';
import { useCategories, type CategoryRow } from '@/features/finance/categories-api';
import { monthRange, shiftMonth } from '@/features/finance/reports';
import { budgetPeriodRange, type BudgetItemProgress } from '@/features/budgets/progress';
import {
  useBudgetsWithProgress,
  useCreateBudget,
  useDeleteBudget,
  useDeleteBudgetItem,
  useSaveBudgetItem,
  type BudgetItemRow,
  type BudgetRow,
} from '@/features/budgets/api';

/** `window.confirm` on web (Alert is a no-op on react-native-web), Alert everywhere else. */
function confirmAndRun(message: string, run: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) run();
    return;
  }
  Alert.alert('Are you sure?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: run },
  ]);
}

export default function BudgetsScreen() {
  const router = useRouter();
  const { data: budgets, isLoading, error, refetch, isRefetching } = useBudgetsWithProgress();
  const { data: categories } = useCategories();
  const deleteBudget = useDeleteBudget();
  const deleteBudgetItem = useDeleteBudgetItem();

  const [formOpen, setFormOpen] = useState(false);
  const [itemSheet, setItemSheet] = useState<{ budget: BudgetRow; item: BudgetItemRow | null } | null>(null);

  const categoryName = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories]
  );

  const expenseCategories = useMemo(
    () => (categories ?? []).filter((category) => category.kind === 'expense'),
    [categories]
  );

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Budgets"
          subtitle="Set a spending limit per category and watch it fill up as you spend."
          action={<Button label="New budget" size="sm" onPress={() => setFormOpen(true)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : budgets.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          description="Plan how much to spend per category for a month or year, then track it as you go."
          actionLabel="New budget"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        budgets.map(({ budget, itemProgress, totals }) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            itemProgress={itemProgress}
            totals={totals}
            categoryName={categoryName}
            hasCategories={expenseCategories.length > 0}
            onAddCategory={() => setItemSheet({ budget, item: null })}
            onManageCategories={() => router.push('/finance/categories')}
            onEditItem={(item) => setItemSheet({ budget, item })}
            onDeleteItem={(item) =>
              confirmAndRun(`Remove ${categoryName.get(item.category_id) ?? 'this category'} from the budget?`, () =>
                deleteBudgetItem.mutate(item.id)
              )
            }
            onDelete={() =>
              confirmAndRun(`Delete the "${budget.name}" budget? Its transactions are not affected.`, () =>
                deleteBudget.mutate(budget.id)
              )
            }
          />
        ))
      )}

      <BudgetFormSheet visible={formOpen} onClose={() => setFormOpen(false)} existingBudgets={budgets} />
      <BudgetItemFormSheet
        visible={itemSheet !== null}
        budget={itemSheet?.budget ?? null}
        item={itemSheet?.item ?? null}
        usedCategoryIds={
          new Set((itemSheet ? budgets.find((row) => row.budget.id === itemSheet.budget.id) : undefined)
            ?.itemProgress.map((entry) => entry.item.category_id) ?? [])
        }
        categories={expenseCategories}
        onClose={() => setItemSheet(null)}
      />
    </Screen>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <View style={{ gap: spacing.xxs }}>
      <ThemedText variant="caption" tone="muted">
        {label}
      </ThemedText>
      <ThemedText variant="body" weight="semibold" tone={tone}>
        {value}
      </ThemedText>
    </View>
  );
}

function BudgetCard({
  budget,
  itemProgress,
  totals,
  categoryName,
  hasCategories,
  onAddCategory,
  onManageCategories,
  onEditItem,
  onDeleteItem,
  onDelete,
}: {
  budget: BudgetRow;
  itemProgress: BudgetItemProgress[];
  totals: { plannedMinor: number; spentMinor: number; remainingMinor: number };
  categoryName: Map<string, string>;
  hasCategories: boolean;
  onAddCategory: () => void;
  onManageCategories: () => void;
  onEditItem: (item: BudgetItemRow) => void;
  onDeleteItem: (item: BudgetItemRow) => void;
  onDelete: () => void;
}) {
  const range = budgetPeriodRange(budget);
  const isOver = totals.remainingMinor < 0;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <ThemedText variant="subtitle">{budget.name}</ThemedText>
          <ThemedText variant="caption" tone="muted">
            {range.label}
            {budget.rollover_enabled ? ' · rolls over' : ''}
          </ThemedText>
        </View>
        <IconButton icon="trash-outline" accessibilityLabel={`Delete ${budget.name}`} onPress={onDelete} />
      </View>

      {itemProgress.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <Total label="Planned" value={formatMoney(totals.plannedMinor, budget.currency)} />
          <Total
            label="Spent"
            value={formatMoney(totals.spentMinor, budget.currency)}
            tone={isOver ? 'negative' : undefined}
          />
          <Total
            label={isOver ? 'Over by' : 'Left'}
            value={formatMoney(Math.abs(totals.remainingMinor), budget.currency)}
            tone={isOver ? 'negative' : 'positive'}
          />
        </View>
      ) : null}

      {itemProgress.length === 0 ? (
        <ThemedText variant="body" tone="muted">
          No categories yet — add one to start tracking.
        </ThemedText>
      ) : (
        <View style={{ gap: spacing.md }}>
          {itemProgress.map((entry) => (
            <BudgetItemBar
              key={entry.item.id}
              label={categoryName.get(entry.item.category_id) ?? 'Removed category'}
              entry={entry}
              currency={budget.currency}
              onEdit={() => onEditItem(entry.item)}
              onDelete={() => onDeleteItem(entry.item)}
            />
          ))}
        </View>
      )}

      {hasCategories ? (
        <Button label="Add category" variant="secondary" size="sm" onPress={onAddCategory} />
      ) : (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="caption" tone="muted">
            You don&apos;t have any expense categories yet.
          </ThemedText>
          <Button label="Add categories" variant="secondary" size="sm" onPress={onManageCategories} />
        </View>
      )}
    </Card>
  );
}

function BudgetItemBar({
  label,
  entry,
  currency,
  onEdit,
  onDelete,
}: {
  label: string;
  entry: BudgetItemProgress;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const isOver = entry.remainingMinor < 0;
  const displayPercent = Math.round(entry.progress * 100);
  const barPercent = Math.min(displayPercent, 100);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label} budget, ${displayPercent} percent used`}
          onPress={onEdit}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <ThemedText variant="body" style={{ flex: 1 }} numberOfLines={1}>
            {label}
          </ThemedText>
          <ThemedText variant="caption" tone={isOver ? 'negative' : 'muted'}>
            {formatMoney(entry.spentMinor, currency, { showCurrency: false })} /{' '}
            {formatMoney(entry.availableMinor, currency, { showCurrency: false })}
          </ThemedText>
        </Pressable>
        <IconButton
          icon="close-circle-outline"
          accessibilityLabel={`Remove ${label} from this budget`}
          onPress={onDelete}
        />
      </View>
      <View style={{ height: 6, borderRadius: radius.full, backgroundColor: theme.colors.surfaceAlt }}>
        <View
          style={{
            height: 6,
            width: `${Math.max(barPercent, entry.spentMinor > 0 ? 2 : 0)}%`,
            borderRadius: radius.full,
            backgroundColor: isOver ? theme.colors.negative : theme.colors.primary,
          }}
        />
      </View>
      {isOver ? (
        <ThemedText variant="caption" tone="negative">
          {displayPercent}% used — over by {formatMoney(Math.abs(entry.remainingMinor), currency)}
        </ThemedText>
      ) : null}
    </View>
  );
}

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function BudgetFormSheet({
  visible,
  onClose,
  existingBudgets,
}: {
  visible: boolean;
  onClose: () => void;
  existingBudgets: { budget: BudgetRow }[];
}) {
  const { today } = useToday();
  const createBudget = useCreateBudget();

  const [name, setName] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [offset, setOffset] = useState('0');
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [rolloverEnabled, setRolloverEnabled] = useState(false);
  const [copyFrom, setCopyFrom] = useState(true);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const periodStart = useMemo<IsoDate>(() => {
    if (period === 'yearly') {
      const year = Number(today.slice(0, 4)) + Number(offset);
      return `${year}-01-01`;
    }
    return monthRange(shiftMonth(today, -Number(offset))).from;
  }, [period, offset, today]);

  const defaultLabel = budgetPeriodRange({ period, period_start: periodStart }).label;

  const previousBudget = useMemo(() => {
    const candidates = existingBudgets
      .map((row) => row.budget)
      .filter((row) => row.period === period && row.period_start < periodStart)
      .sort((a, b) => b.period_start.localeCompare(a.period_start));
    return candidates[0] ?? null;
  }, [existingBudgets, period, periodStart]);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setPeriod('monthly');
    setOffset('0');
    setCurrency(SUPPORTED_CURRENCIES[0]);
    setRolloverEnabled(false);
    setCopyFrom(true);
    setErrors({});
  }, [visible]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    const finalName = name.trim() || defaultLabel;
    if (finalName.length === 0) nextErrors.name = 'Give the budget a name.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await createBudget.mutateAsync({
      name: finalName,
      period,
      periodStart,
      currency,
      rolloverEnabled,
      copyFromBudgetId: copyFrom && previousBudget ? previousBudget.id : null,
    });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title="New budget"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={createBudget.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <OptionGroup label="Period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      <OptionGroup
        options={
          period === 'monthly'
            ? [
                { value: '0', label: 'This month' },
                { value: '1', label: 'Next month' },
              ]
            : [
                { value: '0', label: 'This year' },
                { value: '1', label: 'Next year' },
              ]
        }
        value={offset}
        onChange={setOffset}
      />

      <TextField
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setErrors((current) => ({ ...current, name: undefined }));
        }}
        error={errors.name}
        placeholder={defaultLabel}
      />

      <OptionGroup
        label="Currency"
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={currency}
        onChange={setCurrency}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Checkbox
          checked={rolloverEnabled}
          onChange={setRolloverEnabled}
          accessibilityLabel="Roll unused money into the next period"
        />
        <ThemedText variant="body" style={{ flex: 1 }}>
          Roll unused money into the next period
        </ThemedText>
      </View>

      {previousBudget ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Checkbox
            checked={copyFrom}
            onChange={setCopyFrom}
            accessibilityLabel={`Start from ${previousBudget.name}'s categories`}
          />
          <ThemedText variant="body" style={{ flex: 1 }}>
            Start from &quot;{previousBudget.name}&quot;&apos;s categories
            {rolloverEnabled ? ', carrying over what\'s unspent' : ''}
          </ThemedText>
        </View>
      ) : null}

      {createBudget.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(createBudget.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}

function BudgetItemFormSheet({
  visible,
  budget,
  item,
  usedCategoryIds,
  categories,
  onClose,
}: {
  visible: boolean;
  budget: BudgetRow | null;
  item: BudgetItemRow | null;
  usedCategoryIds: Set<string>;
  categories: CategoryRow[];
  onClose: () => void;
}) {
  const saveBudgetItem = useSaveBudgetItem();

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ category?: string; amount?: string }>({});

  useEffect(() => {
    if (!visible || !budget) return;
    setCategoryId(item?.category_id ?? '');
    setAmount(item ? fromMinorUnits(item.planned_amount_minor, budget.currency) : '');
    setErrors({});
  }, [visible, budget, item]);

  if (!budget) return null;

  // Editing keeps the category fixed; adding offers only categories not
  // already on this budget, since re-picking one would just be this same
  // edit flow under a different name.
  const availableCategories = item
    ? categories.filter((category) => category.id === item.category_id)
    : categories.filter((category) => !usedCategoryIds.has(category.id));

  async function handleSave() {
    if (!budget) return;

    const nextErrors: typeof errors = {};
    if (!categoryId) nextErrors.category = 'Choose a category.';
    if (amount.trim() === '' || Number(amount) < 0) nextErrors.amount = 'Enter an amount.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await saveBudgetItem.mutateAsync({
      budgetId: budget.id,
      categoryId,
      plannedAmount: amount,
      currency: budget.currency,
    });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={item ? 'Edit category budget' : 'Add a category'}
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label="Save"
            loading={saveBudgetItem.isPending}
            fullWidth
            onPress={() => void handleSave()}
          />
        </View>
      }
    >
      {availableCategories.length === 0 ? (
        <ThemedText variant="body" tone="negative">
          Every expense category is already on this budget.
        </ThemedText>
      ) : (
        <OptionGroup
          label="Category"
          options={availableCategories.map((category) => ({ value: category.id, label: category.name }))}
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            setErrors((current) => ({ ...current, category: undefined }));
          }}
        />
      )}
      {errors.category ? (
        <ThemedText variant="caption" tone="negative">
          {errors.category}
        </ThemedText>
      ) : null}

      <MoneyField
        label="Planned amount"
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setErrors((current) => ({ ...current, amount: undefined }));
        }}
        currency={budget.currency}
        error={errors.amount}
        autoFocus
      />

      {saveBudgetItem.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(saveBudgetItem.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
