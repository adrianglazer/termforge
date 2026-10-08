import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ActionButton as Button } from './ActionButton';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaneNode, Server } from '@/types/domain';
import type { ManagedSession } from '@/sessions/manager';

type Props = {
  node: PaneNode;
  workspaceId: string;
  onSplit: (id: string, axis: 'row' | 'column') => void;
  onClose: (id: string) => void;
  onZoom: (id: string) => void;
  onResize: (id: string, delta: number) => void;
  onAssign: (id: string, serverId: string) => void;
  servers: Server[];
  liveSessions: ManagedSession[];
  onDisconnect: (sessionId: string) => void;
};

export function WorkspacePane(props: Props) {
  const { node, servers, liveSessions } = props;
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [choosing, setChoosing] = useState(false);
  if (node.kind === 'split') {
    const sideBySide = node.axis === 'row' && width >= 600;
    const available = Math.max(1, width - 12);
    const ratio = Math.max(280 / available, Math.min(1 - 280 / available, node.ratio));
    return (
      <View style={styles.group} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {sideBySide ? (
          <View style={styles.actions}>
            <Button
              label="Narrower left pane"
              onPress={() => props.onResize(node.id, -0.1)}
              disabled={node.ratio <= 280 / available}
            />
            <Button
              label="Wider left pane"
              onPress={() => props.onResize(node.id, 0.1)}
              disabled={node.ratio >= 1 - 280 / available}
            />
          </View>
        ) : node.axis === 'row' ? (
          <Text style={{ color: theme.muted }}>Panes are stacked to fit this screen.</Text>
        ) : null}
        <View style={[styles.group, sideBySide && styles.row]}>
          {node.children.map((child, index) => (
            <View
              key={child.id}
              style={
                sideBySide ? { flex: index === 0 ? ratio : 1 - ratio, minWidth: 280 } : undefined
              }
            >
              <WorkspacePane {...props} node={child} />
            </View>
          ))}
        </View>
      </View>
    );
  }
  const session = liveSessions.find((item) => item.paneId === node.id);
  const server = servers.find((item) => item.id === node.serverId);
  const options = (
    <Button
      label="Options…"
      onPress={() =>
        Alert.alert('Arrange pane', server?.name ?? 'New terminal', [
          { text: 'Split side by side', onPress: () => props.onSplit(node.id, 'row') },
          { text: 'Split top and bottom', onPress: () => props.onSplit(node.id, 'column') },
          { text: 'Expand terminal', onPress: () => props.onZoom(node.id) },
          { text: 'Remove pane', style: 'destructive', onPress: () => props.onClose(node.id) },
          { text: 'Cancel', style: 'cancel' },
        ])
      }
    />
  );
  return (
    <View style={[styles.pane, { borderColor: theme.muted }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {server?.name ?? node.title ?? 'New terminal'}
      </Text>
      <Text style={{ color: session ? theme.accent : theme.muted }}>
        {session
          ? `Connected · ${session.state}`
          : server
            ? `${server.username}@${server.host}`
            : 'Choose a saved server for this pane.'}
      </Text>
      {server && !choosing ? (
        <View style={styles.actions}>
          <Button
            label={session ? 'View pane' : 'Connect'}
            onPress={() =>
              session
                ? props.onZoom(node.id)
                : router.push({
                    pathname: '/terminal',
                    params: {
                      serverId: server.id,
                      paneId: node.id,
                      workspaceId: props.workspaceId,
                    },
                  })
            }
          />
          {session ? (
            <Button
              label="Disconnect"
              danger
              onPress={() => props.onDisconnect(session.sessionId)}
            />
          ) : (
            <Button label="Change server" onPress={() => setChoosing(true)} />
          )}
          {options}
        </View>
      ) : (
        <View style={styles.group}>
          {servers.map((item) => (
            <Button
              key={item.id}
              label={item.name}
              onPress={() => {
                props.onAssign(node.id, item.id);
                setChoosing(false);
              }}
            />
          ))}
          {!servers.length ? (
            <Button label="Go to servers to add one" onPress={() => router.push('/servers')} />
          ) : null}
          {choosing ? <Button label="Cancel" onPress={() => setChoosing(false)} /> : null}
          {options}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pane: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  title: { fontSize: 18, fontWeight: '600', flexShrink: 0 },
});
