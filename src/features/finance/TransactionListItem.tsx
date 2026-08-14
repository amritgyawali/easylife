import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { ThemedText } from '@/components/ui/ThemedText';
import { formatMoney } from '@/utils/money';
import { relativeDayLabel, type IsoDate } from '@/utils/date';
import type { TransactionRow } from '@/features/finance/transactions-api';

export interface TransactionListItemProps {
  transaction: TransactionRow;
  today: IsoDate;
  accountName?: string;
  destinationAccountName?: string;
  categoryName?: string;
  counterpartyName?: string;
  onDelete?: () => void;
  /** False for the first row in a card, so the group has no leading rule. */
  divider?: boolean;
}

/**
 * One row in the transaction list.
 *
 * Direction is carried by an explicit sign and an arrow icon as well as
 * colour, so the row still reads correctly for someone who can't distinguish
 * the red/green pair — the accessibility rule the theme's `positive` /
 * `negative` tokens are documented under.
 */
export function TransactionListItem({
  transaction,
  today,
  accountName,
  destinationAccountName,
  categoryName,
  counterpartyName,
  onDelete,
  divider = true,
}: TransactionListItemProps) {
  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';

  const tone = isTransfer ? 'default' : isIncome ? 'positive' : 'negative';
  const sign = isTransfer ? '' : isIncome ? '+' : '-';
  const amount = formatMoney(transaction.amount_minor, transaction.currency);

  return (
    <ListRow
      divider={divider}
      icon={isTransfer ? 'swap-horizontal' : isIncome ? 'arrow-down' : 'arrow-up'}
      iconTone={isTransfer ? 'neutral' : isIncome ? 'positive' : 'negative'}
      title={transaction.description || counterpartyName || categoryName || 'Transaction'}
      subtitle={`${relativeDayLabel(transaction.transaction_date, today)}${
        accountName ? ` · ${accountName}` : ''
      }${isTransfer && destinationAccountName ? ` → ${destinationAccountName}` : ''}`}
      meta={
        categoryName || counterpartyName ? (
          <>
            {categoryName ? <Badge label={categoryName} size="sm" /> : null}
            {counterpartyName ? <Badge label={counterpartyName} size="sm" tone="primary" /> : null}
          </>
        ) : undefined
      }
      trailing={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <ThemedText variant="body" weight="semibold" tone={tone} numeric>
            {sign}
            {amount}
          </ThemedText>
          {onDelete ? (
            <IconButton
              icon="trash-outline"
              accessibilityLabel={`Delete ${transaction.description || 'transaction'} of ${amount}`}
              onPress={onDelete}
              size={17}
            />
          ) : null}
        </View>
      }
    />
  );
}
