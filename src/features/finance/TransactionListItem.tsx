import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
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
}

/**
 * One row in the transaction list.
 *
 * Direction is carried by an explicit sign and an arrow icon as well as
 * colour, so the row still reads correctly for someone who can't distinguish
 * the red/green pair — the accessibility rule the theme's `positive` /
 * `negative` tokens are documented under. The amount is tabular so a column of
 * them lines up on the decimal point.
 */
export function TransactionListItem({
  transaction,
  today,
  accountName,
  destinationAccountName,
  categoryName,
  counterpartyName,
  onDelete,
}: TransactionListItemProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';

  const tone = isTransfer ? 'default' : isIncome ? 'positive' : 'negative';
  const sign = isTransfer ? '' : isIncome ? '+' : '-';
  const icon = isTransfer ? 'swap-horizontal' : isIncome ? 'arrow-down' : 'arrow-up';
  const iconColor = isTransfer
    ? theme.colors.textMuted
    : isIncome
      ? theme.colors.positive
      : theme.colors.negative;
  const iconBackground = isTransfer
    ? theme.colors.surfaceAlt
    : isIncome
      ? theme.colors.positiveSurface
      : theme.colors.negativeSurface;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? spacing.md : spacing.lg,
        minHeight: minTouchTarget + spacing.sm,
        paddingVertical: spacing.md,
        paddingLeft: compact ? spacing.md : spacing.lg,
        paddingRight: onDelete ? spacing.sm : compact ? spacing.md : spacing.lg,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBackground,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1, gap: spacing.xxs, minWidth: 0 }}>
        <ThemedText variant="body" weight="medium" numberOfLines={1}>
          {transaction.description || counterpartyName || categoryName || 'Transaction'}
        </ThemedText>
        <ThemedText variant="caption" tone="muted" numberOfLines={1}>
          {relativeDayLabel(transaction.transaction_date, today)}
          {accountName ? ` · ${accountName}` : ''}
          {isTransfer && destinationAccountName ? ` → ${destinationAccountName}` : ''}
        </ThemedText>
        {categoryName || counterpartyName ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs }}>
            {categoryName ? <Badge label={categoryName} icon="pricetag-outline" /> : null}
            {counterpartyName ? <Badge label={counterpartyName} tone="primary" /> : null}
          </View>
        ) : null}
      </View>

      <ThemedText variant="body" weight="semibold" tone={tone} numeric numberOfLines={1}>
        {sign}
        {formatMoney(transaction.amount_minor, transaction.currency)}
      </ThemedText>

      {onDelete ? (
        <IconButton
          icon="trash-outline"
          tone="muted"
          accessibilityLabel={`Delete ${transaction.description || 'transaction'} of ${formatMoney(
            transaction.amount_minor,
            transaction.currency
          )}`}
          onPress={onDelete}
        />
      ) : null}
    </View>
  );
}
