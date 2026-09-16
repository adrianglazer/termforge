import type { ErrorInfo, PropsWithChildren } from 'react';
import { Component } from 'react';
import { Text, View } from 'react-native';
import { logger } from '@/logging/logger';
import { openMetadataDatabase } from '@/persistence/bootstrap';

type State = { failed: boolean };
export class AppBoundary extends Component<PropsWithChildren, State> {
  override state: State = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidMount() {
    void openMetadataDatabase().catch((error: unknown) => {
      logger.error('metadata_startup_failed', {}, error instanceof Error ? error : undefined);
    });
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ui_boundary', { componentStack: info.componentStack ?? undefined }, error);
  }
  override render() {
    return this.state.failed ? (
      <View>
        <Text>Termforge could not open this screen.</Text>
      </View>
    ) : (
      this.props.children
    );
  }
}
