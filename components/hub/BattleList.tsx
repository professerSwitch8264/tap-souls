import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface BattleListProps {
  enemies: any[];
  playerProgress: {
    unlockedEnemies: string[];
    defeatedEnemies: string[];
  };
  onSelectEnemy: (enemyId: string) => void;
}

export function BattleList({ enemies, playerProgress, onSelectEnemy }: BattleListProps) {
  const unlocked = playerProgress?.unlockedEnemies || [];
  const defeated = playerProgress?.defeatedEnemies || [];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>SELECT ENCOUNTER</Text>
      <FlatList
        data={enemies || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isUnlocked = unlocked.includes(item.id) || defeated.includes(item.id);
          
          return (
            <TouchableOpacity
              style={[styles.enemyCard, !isUnlocked && styles.lockedCard]}
              onPress={() => isUnlocked && onSelectEnemy(item.id)}
              disabled={!isUnlocked}
              activeOpacity={0.7}
            >
              <View style={styles.enemyIconBox}>
                 <FontAwesome5 name={item.isBoss ? "skull" : "ghost"} size={20} color={item.isBoss ? "#ff5252" : "#aaa"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.enemyName}>{item.name}</Text>
                <Text style={styles.enemyStats}>HP: {item.hp} • Damage: {item.damage}</Text>
              </View>
              {isUnlocked ? (
                <View style={styles.playBtn}>
                  <FontAwesome5 name="play" size={12} color="#000" />
                </View>
              ) : (
                <FontAwesome5 name="lock" size={14} color="#444" />
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: {
    color: '#555',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 20,
    textAlign: 'center',
  },
  enemyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  lockedCard: {
    opacity: 0.5,
    backgroundColor: '#0a0a0a',
  },
  enemyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  enemyName: {
    color: '#eee',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  enemyStats: {
    color: '#555',
    fontSize: 11,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffd740',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
});
