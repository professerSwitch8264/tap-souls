import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import mapsData from '../data/maps.json';
import playerTemplate from '../data/player.json';
import weaponsData from '../data/weapons.json';

const SAVE_KEY = '@tap_souls_player_save';

// ===== Types (Combined) =====
export interface Position {
  nodeId: string;
  tileIndex: number;
}

export interface PlayerStats {
  vigor: number;
  strength: number;
  endurance: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  souls: number;
  level: number;
  stats: PlayerStats;
  position: Position;
  inventory: {
    ownedWeapons: string[];
    equippedWeaponId: string;
  };
  progress: {
    unlockedEnemies: string[];
    defeatedEnemies: string[];
  };
}

// ===== Weapon Helper (from useInventory) =====
export interface WeaponData {
  id: string;
  name: string;
  description: string;
  damage: number;
  attackSpeed: number;
  windUp: number;
  active: number;
  recovery: number;
  critRate: number;
  critMultiplier: number;
  scaling: {
    strength: number;
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  icon: string;
  lore: string;
}

export function getWeaponById(weaponId: string): WeaponData | undefined {
  return (weaponsData.weapons as WeaponData[]).find((w) => w.id === weaponId);
}

// ===== Hook =====
export function usePlayerState() {
  const [state, setState] = useState<PlayerState>(playerTemplate as PlayerState);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load from AsyncStorage
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(SAVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge old save with new template structure
          setState(prev => ({
            ...prev,
            ...parsed,
            // Deeply merge nested objects like progress and stats
            stats: { ...prev.stats, ...(parsed.stats || {}) },
            progress: { ...prev.progress, ...(parsed.progress || {}) },
            inventory: { ...prev.inventory, ...(parsed.inventory || {}) }
          }));
        }
      } catch (e) {
        console.error("Failed to load player state", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // 2. Save on changes
  useEffect(() => {
    if (!isLoaded) return;
    const saveState = async () => {
      try {
        await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save player state", e);
      }
    };
    saveState();
  }, [state, isLoaded]);

  // Actions: RPG & Combat
  const setPlayerHp = (hp: number) => setState(prev => ({ ...prev, hp }));
  const gainSouls = (amount: number) => setState(prev => ({ ...prev, souls: prev.souls + amount }));

  const levelUp = (statName: keyof PlayerStats) => {
    const cost = state.level * 100;
    if (state.souls >= cost) {
      setState(prev => {
        const newStats = { ...prev.stats, [statName]: prev.stats[statName] + 1 };
        const newMaxHp = 100 + (newStats.vigor - 10) * 10;
        return {
          ...prev,
          level: prev.level + 1,
          souls: prev.souls - cost,
          stats: newStats,
          maxHp: newMaxHp,
          hp: newMaxHp // Full heal on level up
        };
      });
      return true;
    }
    return false;
  };
  
  const resetTension = () => { /* Tension management could go here or in game logic */ };

  const restAtBonfire = () => {
    setState(prev => ({
      ...prev,
      hp: prev.maxHp
    }));
    return true;
  };

  const markEnemyDefeated = (enemyId: string) => {
    setState(prev => {
        const defeated = prev.progress.defeatedEnemies || [];
        if (defeated.includes(enemyId)) return prev;
        return {
            ...prev,
            progress: {
                ...prev.progress,
                defeatedEnemies: [...defeated, enemyId]
            }
        };
    });
  };

  // Actions: Inventory
  const equipWeapon = (weaponId: string) => {
    if (state.inventory.ownedWeapons.includes(weaponId)) {
      setState(prev => ({
        ...prev,
        inventory: { ...prev.inventory, equippedWeaponId: weaponId }
      }));
      return true;
    }
    return false;
  };

  const getEquippedWeapon = (): WeaponData | undefined => {
    return getWeaponById(state.inventory.equippedWeaponId);
  };

  const resetProgress = async () => {
    setState(playerTemplate as PlayerState);
    await AsyncStorage.removeItem(SAVE_KEY);
  };

  return {
    ...state,
    isLoaded,
    // Methods
    levelUp,
    markEnemyDefeated,
    restAtBonfire,
    gainSouls,
    setPlayerHp,
    equipWeapon,
    getEquippedWeapon,
    resetProgress
  };
}
