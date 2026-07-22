import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { logger } from '@/utils/logger';

interface State {
  error: Error | null;
}

/**
 * App-wide error boundary. Catches render-time exceptions that would
 * otherwise produce a blank screen (or, on web, a raw stack trace) and
 * shows a recoverable error screen instead. Feature-level boundaries can be
 * added around risky subtrees (e.g. the OCR review screen) later; this one
 * is the last line of defense at the root.
 */
export class RootErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('root_error_boundary.caught', error, { componentStack: info.componentStack ?? undefined });
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState error={this.state.error} onRetry={this.handleRetry} />
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
