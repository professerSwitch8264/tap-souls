import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const MAP_NODES = [
  { id: 1, name: 'Firelink Shrine', icon: 'fire', color: '#ff9800', completed: true, x: '20%', y: '80%' },
  { id: 2, name: 'Undead Burg', icon: 'skull', color: '#e0e0e0', completed: true, x: '50%', y: '65%' },
  { id: 3, name: 'Cathedral', icon: 'church', color: '#9e9e9e', completed: false, x: '35%', y: '45%' },
  { id: 4, name: 'Catacombs', icon: 'dungeon', color: '#795548', completed: false, x: '65%', y: '35%' },
  { id: 5, name: 'Anor Londo', icon: 'crown', color: '#ffd54f', completed: false, x: '50%', y: '15%' },
];

export function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WORLD MAP</Text>
      <Text style={styles.subtitle}>Choose your path, warrior</Text>

      <View style={styles.mapArea}>
        {/* Connecting Lines (simplified) */}
        <View style={styles.pathLine} />

        {MAP_NODES.map((node) => (
          <View
            key={node.id}
            style={[
              styles.nodeContainer,
              { left: node.x as any, top: node.y as any },
            ]}
          >
            <View
              style={[
                styles.node,
                { borderColor: node.color },
                node.completed && { backgroundColor: 'rgba(255,255,255,0.1)' },
                !node.completed && { opacity: 0.5 },
              ]}
            >
              <FontAwesome5 name={node.icon as any} size={22} color={node.color} />
            </View>
            <Text style={[styles.nodeName, { color: node.color }]}>{node.name}</Text>
            {node.completed && (
              <View style={styles.checkBadge}>
                <FontAwesome5 name="check" size={8} color="#fff" />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
          <Text style={styles.legendText}>Cleared</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#555' }]} />
          <Text style={styles.legendText}>Locked</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: '#ffb300',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'serif',
    textAlign: 'center',
    textShadowColor: 'rgba(255,170,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: 10,
  },
  subtitle: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 5,
    marginBottom: 20,
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  pathLine: {
    position: 'absolute',
    left: '50%',
    top: '15%',
    width: 2,
    height: '65%',
    backgroundColor: '#222',
    transform: [{ translateX: -1 }],
  },
  nodeContainer: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -28 }, { translateY: -28 }],
  },
  node: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeName: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    marginTop: 15,
    marginBottom: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
