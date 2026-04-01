import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface StatusLevelerProps {
  player: {
    level: number;
    souls: number;
    stats: {
      vigor: number;
      strength: number;
      endurance: number;
    };
    levelUp: (stat: string) => void;
    resetProgress: () => void;
  };
}

export function StatusLeveler({ player }: StatusLevelerProps) {
  const handleStatUpgrade = (stat: string) => {
    const cost = player.level * 100;
    if (player.souls >= cost) {
      player.levelUp(stat);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>CHARACTER STATUS</Text>
      
      <View style={styles.levelCard}>
        <Text style={styles.levelLabel}>SOUL LEVEL</Text>
        <Text style={styles.levelValue}>{player.level}</Text>
        <Text style={styles.soulCount}>{player.souls} SOULS</Text>
      </View>

      <View style={styles.statsList}>
        {[
          { id: 'vigor', name: 'VIGOR', value: player.stats.vigor, desc: 'Increases Max HP' },
          { id: 'strength', name: 'STRENGTH', value: player.stats.strength, desc: 'Increases Attack Damage' },
          { id: 'endurance', name: 'ENDURANCE', value: player.stats.endurance, desc: 'Increases Max Poise' },
        ].map((stat) => (
          <View key={stat.id} style={styles.statItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statName}>{stat.name}</Text>
              <Text style={styles.statDesc}>{stat.desc}</Text>
            </View>
            <View style={styles.statActionRow}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <TouchableOpacity 
                style={styles.plusBtn}
                onPress={() => handleStatUpgrade(stat.id)}
              >
                <FontAwesome5 name="plus" size={10} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.upgradeInfo}>
         <Text style={styles.costText}>NEXT LEVEL COST: {player.level * 100} SOULS</Text>
      </View>

      <TouchableOpacity 
        style={styles.resetBtn}
        onPress={() => {
          player.resetProgress();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
      >
        <Text style={styles.resetBtnText}>RESET GAME PROGRESS</Text>
      </TouchableOpacity>
    </ScrollView>
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
  levelCard: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255,215,64,0.05)',
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,215,64,0.1)',
  },
  levelLabel: {
    color: '#ffd740',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 10,
  },
  levelValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  soulCount: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 5,
  },
  statsList: { gap: 15 },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  statName: {
    color: '#eee',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statDesc: {
    color: '#555',
    fontSize: 11,
  },
  statActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statValue: {
    color: '#ffd740',
    fontSize: 18,
    fontWeight: 'bold',
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffd740',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeInfo: {
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 15,
  },
  costText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resetBtn: {
    marginTop: 40,
    marginBottom: 60,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.05)',
  },
  resetBtnText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
