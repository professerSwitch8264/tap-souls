import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

type TabId = 'battle' | 'map' | 'inventory';

interface BottomNavbarProps {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'battle', icon: 'fist-raised', label: 'BATTLE' },
  { id: 'map', icon: 'map-marked-alt', label: 'MAP' },
  { id: 'inventory', icon: 'box-open', label: 'INVENTORY' },
];

export function BottomNavbar({ activeTab, onTabPress }: BottomNavbarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name={tab.icon as any}
              size={18}
              color={isActive ? '#00e5ff' : '#555'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  tabBtnActive: {
    // subtle bg
  },
  tabLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#00e5ff',
  },
  activeIndicator: {
    position: 'absolute',
    top: -1,
    width: 24,
    height: 2,
    backgroundColor: '#00e5ff',
    borderRadius: 1,
  },
});
