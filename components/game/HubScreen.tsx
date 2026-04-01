import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEnemyData } from '../../hooks/useLocalData';
import { InventoryScreen } from './InventoryScreen';
import { BattleList } from '../hub/BattleList';
import { StatusLeveler } from '../hub/StatusLeveler';

interface HubScreenProps {
  player: any;
  onSelectEnemy: (enemyId: string) => void;
}

export function HubScreen({ player, onSelectEnemy }: HubScreenProps) {
  const [activeTab, setActiveTab] = useState<'BATTLE' | 'INVENTORY' | 'STATUS'>('BATTLE');
  const { data: allEnemies } = useEnemyData();

  return (
    <View style={styles.container}>
      {/* 1. Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === 'BATTLE' && (
          <BattleList 
            enemies={allEnemies || []} 
            playerProgress={player.progress} 
            onSelectEnemy={onSelectEnemy} 
          />
        )}
        
        {activeTab === 'INVENTORY' && (
           <InventoryScreen 
              ownedWeapons={player.inventory.ownedWeapons}
              equippedWeaponId={player.inventory.equippedWeaponId}
              onEquip={player.equipWeapon}
              onClose={() => setActiveTab('BATTLE')}
           />
        )}

        {activeTab === 'STATUS' && (
           <StatusLeveler player={player} />
        )}
      </View>

      {/* 2. Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'BATTLE' && styles.activeTab]} 
          onPress={() => setActiveTab('BATTLE')}
        >
          <FontAwesome5 name="fist-raised" size={18} color={activeTab === 'BATTLE' ? '#ffd740' : '#444'} />
          <Text style={[styles.tabText, activeTab === 'BATTLE' && styles.activeTabText]}>BATTLE</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'INVENTORY' && styles.activeTab]} 
          onPress={() => setActiveTab('INVENTORY')}
        >
          <FontAwesome5 name="suitcase" size={18} color={activeTab === 'INVENTORY' ? '#ffd740' : '#444'} />
          <Text style={[styles.tabText, activeTab === 'INVENTORY' && styles.activeTabText]}>ITEMS</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'STATUS' && styles.activeTab]} 
          onPress={() => setActiveTab('STATUS')}
        >
          <FontAwesome5 name="user-alt" size={18} color={activeTab === 'STATUS' ? '#ffd740' : '#444'} />
          <Text style={[styles.tabText, activeTab === 'STATUS' && styles.activeTabText]}>STATUS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    height: 85,
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderColor: '#222',
    paddingBottom: 20,
  },
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {
    borderTopWidth: 2,
    borderColor: '#ffd740',
    marginTop: -1,
  },
  tabText: {
    color: '#444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#ffd740',
  },
});
