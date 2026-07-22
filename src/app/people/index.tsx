import { useEffect, useMemo, useState } from 'react';
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
import { SearchInput } from '@/components/forms/SearchInput';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { toUserMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/money';
import {
  useArchiveCounterparty,
  useCounterparties,
  useCreateCounterparty,
  useUpdateCounterparty,
  type CounterpartyKind,
  type CounterpartyRow,
} from '@/features/finance/counterparties-api';
import { useLoansWithEvents } from '@/features/loans/api';
import { exposureByCounterparty, type CounterpartyExposure } from '@/features/loans/loan-math';
import { useTransactions } from '@/features/finance/transactions-api';
import { LoanFormSheet } from '@/features/loans/LoanFormSheet';

const KIND_OPTIONS: { value: CounterpartyKind; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'business', label: 'Business' },
  { value: 'institution', label: 'Institution' },
];

/**
 * The People module: everyone money moves between, with the net position for
 * each derived from their open loans.
 *
 * The net figure is the point — with someone you've both lent to and borrowed
 * from, two gross numbers make you do the subtraction yourself, and that
 * subtraction is exactly what the screen is for.
 */
export default function PeopleScreen() {
  const { data: people, isLoading, error, refetch, isRefetching } = useCounterparties();
  const { data: loans } = useLoansWithEvents();
  const { data: transactions } = useTransactions();

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CounterpartyRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loanFor, setLoanFor] = useState<string | null>(null);

  const exposureByPerson = useMemo(() => {
    const exposures = exposureByCounterparty(
      loans.map((entry) => ({
        counterparty_id: entry.loan.counterparty_id,
        currency: entry.loan.currency,
        direction: entry.loan.direction,
        loan: entry.loan,
        events: entry.events,
      }))
    );

    const map = new Map<string, CounterpartyExposure[]>();
    for (const exposure of exposures) {
      map.set(exposure.counterpartyId, [...(map.get(exposure.counterpartyId) ?? []), exposure]);
    }
    return map;
  }, [loans]);

  const transactionCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transaction of transactions ?? []) {
      if (!transaction.counterparty_id) continue;
      counts.set(transaction.counterparty_id, (counts.get(transaction.counterparty_id) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!people) return [];
    if (!needle) return people;
    return people.filter(
      (person) =>
        person.display_name.toLowerCase().includes(needle) ||
        (person.phone?.toLowerCase().includes(needle) ?? false) ||
        (person.email?.toLowerCase().includes(needle) ?? false)
    );
  }, [people, query]);

  function openSheet(person: CounterpartyRow | null) {
    setEditing(person);
    setSheetOpen(true);
  }

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="People"
            subtitle="Everyone money moves between, and where you stand with each."
            action={<Button label="Add person" size="sm" onPress={() => openSheet(null)} />}
          />
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search people" />
        </>
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : matching.length === 0 ? (
        <EmptyState
          title={query ? 'No matching people' : 'No people yet'}
          description={
            query
              ? 'Try a different search.'
              : 'Add the people and businesses you lend to, borrow from, or pay regularly.'
          }
          actionLabel={query ? undefined : 'Add person'}
          onAction={query ? undefined : () => openSheet(null)}
        />
      ) : (
        matching.map((person) => {
          const positions = exposureByPerson.get(person.id) ?? [];

          return (
            <Card key={person.id} style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <ThemedText variant="subtitle">{person.display_name}</ThemedText>
                  {person.phone || person.email ? (
                    <ThemedText variant="caption" tone="muted">
                      {[person.phone, person.email].filter(Boolean).join(' · ')}
                    </ThemedText>
                  ) : null}
                </View>
                <IconButton
                  icon="create-outline"
                  accessibilityLabel={`Edit ${person.display_name}`}
                  onPress={() => openSheet(person)}
                />
              </View>

              {positions.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  {positions.map((position) => (
                    <ThemedText
                      key={position.currency}
                      variant="body"
                      weight="semibold"
                      tone={
                        position.netMinor === 0 ? 'muted' : position.netMinor > 0 ? 'positive' : 'negative'
                      }
                    >
                      {position.netMinor === 0
                        ? `Settled (${position.currency})`
                        : position.netMinor > 0
                          ? `Owes you ${formatMoney(position.netMinor, position.currency)}`
                          : `You owe ${formatMoney(-position.netMinor, position.currency)}`}
                    </ThemedText>
                  ))}
                </View>
              ) : (
                <ThemedText variant="caption" tone="muted">
                  No open loans.
                </ThemedText>
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' }}>
                <Badge label={person.kind} />
                {(transactionCount.get(person.id) ?? 0) > 0 ? (
                  <Badge label={`${transactionCount.get(person.id)} transactions`} tone="primary" />
                ) : null}
                <View style={{ flex: 1 }} />
                <Button label="New loan" size="sm" variant="ghost" onPress={() => setLoanFor(person.id)} />
              </View>
            </Card>
          );
        })
      )}

      <PersonFormSheet
        visible={sheetOpen}
        person={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
      />
      <LoanFormSheet
        visible={loanFor !== null}
        defaultCounterpartyId={loanFor}
        onClose={() => setLoanFor(null)}
      />
    </Screen>
  );
}

function PersonFormSheet({
  visible,
  person,
  onClose,
}: {
  visible: boolean;
  person: CounterpartyRow | null;
  onClose: () => void;
}) {
  const createPerson = useCreateCounterparty();
  const updatePerson = useUpdateCounterparty();
  const archivePerson = useArchiveCounterparty();

  const [displayName, setDisplayName] = useState('');
  const [kind, setKind] = useState<CounterpartyKind>('person');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDisplayName(person?.display_name ?? '');
    setKind((person?.kind as CounterpartyKind | undefined) ?? 'person');
    setPhone(person?.phone ?? '');
    setEmail(person?.email ?? '');
    setNotes(person?.notes ?? '');
    setNameError(null);
  }, [visible, person]);

  const pending = createPerson.isPending || updatePerson.isPending || archivePerson.isPending;
  const error = createPerson.error ?? updatePerson.error ?? archivePerson.error;

  async function handleSave() {
    if (displayName.trim().length === 0) {
      setNameError('Give them a name.');
      return;
    }

    const input = { displayName, kind, phone, email, notes };

    if (person) await updatePerson.mutateAsync({ id: person.id, ...input });
    else await createPerson.mutateAsync(input);

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={person ? 'Edit person' : 'Add person'}
      onClose={onClose}
      footer={
        <>
          {person ? (
            <Button
              label="Archive"
              variant="secondary"
              disabled={pending}
              onPress={async () => {
                await archivePerson.mutateAsync(person.id);
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
        label="Name"
        value={displayName}
        onChangeText={(value) => {
          setDisplayName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        placeholder="Who is this?"
        autoFocus
      />
      <OptionGroup label="Type" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Optional"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Optional"
      />
      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
