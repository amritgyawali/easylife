import { SafeAreaView } from 'react-native';

import { spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';

export interface ComingSoonScreenProps {
  title: string;
  phase: string;
}

/**
 * Placeholder for routes whose navigation chrome is wired up in Phase 1 but
 * whose feature content lands in a later phase (see ARCHITECTURE.md
 * "Implementation sequence"). Keeps every sidebar/tab link real and
 * navigable instead of dead, without pretending the feature is built.
 */
export function ComingSoonScreen({ title, phase }: ComingSoonScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
      <EmptyState
        icon="construct-outline"
        title={title}
        description={`This screen is planned for ${phase}.`}
      />
    </SafeAreaView>
  );
}
