import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMapData, GameMap } from '../../hooks/useLocalData';

export interface MapScreenProps {
  currentNodeId: string;
  unlockedNodes: string[];
  lastBonfireId: string;
  onSelectNode: (node: GameMap) => void;
}

export function MapScreen({ currentNodeId, unlockedNodes, lastBonfireId, onSelectNode }: MapScreenProps) {
  const { maps, loading } = useMapData();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>FETCHING MAP DATA...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WORLD MAP</Text>
      <Text style={styles.subtitle}>Choose your path, warrior</Text>

      <View style={styles.mapArea}>
        {/* Connecting Lines (simplified) */}
        <View style={styles.pathLine} />

        {maps.map((node) => {
          const isUnlocked = unlockedNodes.includes(node.id);
          const isCurrent = currentNodeId === node.id;
          const isLastBonfire = lastBonfireId === node.id && node.type === 'bonfire';

          return (
            <TouchableOpacity
              key={node.id}
              activeOpacity={0.7}
              onPress={() => {
                if (isUnlocked) {
                  onSelectNode(node);
                }
              }}
              style={[
                styles.nodeContainer,
                { left: node.x as any, top: node.y as any },
              ]}
            >
              {isCurrent && (
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              )}
              
              <View
                style={[
                  styles.node,
                  { borderColor: node.color },
                  isUnlocked ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { opacity: 0.3 },
                  isCurrent && { borderWidth: 3, borderColor: '#fff' }
                ]}
              >
                <FontAwesome5 name={node.icon as any} size={22} color={node.color} />
              </View>
              <Text style={[styles.nodeName, { color: node.color }]}>{node.name}</Text>
              
              {isLastBonfire && (
                <View style={styles.bonfireBadge}>
                  <FontAwesome5 name="fire" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
          <Text style={styles.legendText}>Unlocked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#555' }]} />
          <Text style={styles.legendText}>Locked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#fff' }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ffb300', marginTop: 20, letterSpacing: 2, fontSize: 12 },
  title: {
    color: '#ffb300', fontSize: 22, fontWeight: '800', letterSpacing: 4, 
    textAlign: 'center', textShadowColor: 'rgba(255,170,0,0.5)', textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4, marginTop: 10,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  subtitle: { color: '#555', fontSize: 12, textAlign: 'center', letterSpacing: 2, marginTop: 5, marginBottom: 20 },
  mapArea: { flex: 1, position: 'relative', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: '#1a1a1a' },
  pathLine: { position: 'absolute', left: '50%', top: '15%', width: 2, height: '65%', backgroundColor: '#222', transform: [{ translateX: -1 }] },
  nodeContainer: { position: 'absolute', alignItems: 'center', transform: [{ translateX: -28 }, { translateY: -28 }], zIndex: 2 },
  pulseRing: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,152,0,0.4)', top: -4, left: -4, zIndex: 0 },
  node: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  nodeName: { fontSize: 9, fontWeight: 'bold', marginTop: 4, letterSpacing: 1, textAlign: 'center', zIndex: 1, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 4, borderRadius: 4 },
  bonfireBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ff9800', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#111', zIndex: 3 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 15, marginBottom: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#666', fontSize: 10, fontWeight: 'bold' },
});
