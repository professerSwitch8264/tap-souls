import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>INVENTORY</Text>
      <Text style={styles.subtitle}>Your loot awaits</Text>

      <View style={styles.emptyContainer}>
        <FontAwesome5 name="box-open" size={50} color="#333" />
        <Text style={styles.emptyText}>COMING SOON</Text>
        <Text style={styles.emptySubText}>Defeat bosses to collect rare items</Text>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  emptyText: {
    color: '#444',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  emptySubText: {
    color: '#333',
    fontSize: 12,
    letterSpacing: 1,
  },
});
