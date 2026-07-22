import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { toUserMessage } from '@/utils/errors';
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useSeedStarterCategories,
  useUpdateCategory,
  type CategoryKind,
  type CategoryRow,
} from '@/features/finance/categories-api';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

export default function CategoriesScreen() {
  const { data: categories, isLoading, error, refetch, isRefetching } = useCategories();
  const seedStarters = useSeedStarterCategories();
  const archiveCategory = useArchiveCategory();

  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const byKind = KIND_OPTIONS.map((option) => ({
    ...option,
    rows: (categories ?? []).filter((category) => category.kind === option.value),
  })).filter((group) => group.rows.length > 0);

  function openSheet(category: CategoryRow | null) {
    setEditing(category);
    setSheetOpen(true);
  }

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Categories"
          subtitle="How spending and income are grouped in reports."
          action={<Button label="Add" size="sm" onPress={() => openSheet(null)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (categories?.length ?? 0) === 0 ? (
        <View style={{ gap: spacing.lg }}>
          <EmptyState
            title="No categories yet"
            description="Start from a common set for Nepal, or add your own from scratch."
            actionLabel="Use the starter set"
            onAction={() => seedStarters.mutate()}
          />
          <Button label="Add my own" variant="secondary" onPress={() => openSheet(null)} />
          {seedStarters.error ? (
            <ThemedText variant="caption" tone="negative">
              {toUserMessage(seedStarters.error)}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        byKind.map((group) => (
          <View key={group.value} style={{ gap: spacing.sm }}>
            <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
              {group.label.toUpperCase()}
            </ThemedText>
            <Card padded={false}>
              {group.rows.map((category) => (
                <View
                  key={category.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingLeft: spacing.md,
                  }}
                >
                  <ThemedText variant="body" style={{ flex: 1 }}>
                    {category.name}
                  </ThemedText>
                  {category.is_system ? <Badge label="Starter" /> : null}
                  <IconButton
                    icon="create-outline"
                    accessibilityLabel={`Rename ${category.name}`}
                    onPress={() => openSheet(category)}
                  />
                  <IconButton
                    icon="archive-outline"
                    accessibilityLabel={`Archive ${category.name}`}
                    onPress={() => archiveCategory.mutate(category.id)}
                  />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}

      <CategoryFormSheet visible={sheetOpen} category={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

function CategoryFormSheet({
  visible,
  category,
  onClose,
}: {
  visible: boolean;
  category: CategoryRow | null;
  onClose: () => void;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset on open so a previous edit never leaks into the next one.
  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? '');
    setKind((category?.kind as CategoryKind | undefined) ?? 'expense');
    setNameError(null);
  }, [visible, category]);

  const pending = createCategory.isPending || updateCategory.isPending;
  const error = createCategory.error ?? updateCategory.error;

  async function handleSave() {
    if (name.trim().length === 0) {
      setNameError('Give the category a name.');
      return;
    }

    if (category) await updateCategory.mutateAsync({ id: category.id, name, kind });
    else await createCategory.mutateAsync({ name, kind });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={category ? 'Rename category' : 'New category'}
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={pending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <TextField
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        placeholder="e.g. Groceries"
        autoFocus
      />
      <OptionGroup label="Applies to" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
