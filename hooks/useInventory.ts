import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import weaponsData from '../data/weapons.json';

const INVENTORY_KEY = '@tap_souls_inventory';

// ===== Types =====
export interface WeaponData {
  id: string;
  name: string;
  description: string;
  damage: number;
  attackSpeed: number;   // Multiplier: >1 = faster, <1 = slower
  windUp: number;        // ms before hit
  active: number;        // ms of active hit frames
  recovery: number;      // ms after hit
  critRate: number;      // 0-1 probability
  critMultiplier: number;
  scaling: {
    strength: number;    // 0-1 scaling factor
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  icon: string;          // FontAwesome5 icon name
  lore: string;
}

interface InventoryState {
  ownedWeapons: string[];       // weapon IDs
  equippedWeaponId: string;
}

const DEFAULT_INVENTORY: InventoryState = {
  ownedWeapons: ['broken_straight_sword', 'broadsword', 'greatsword'], // ได้ทุกอันตั้งแต่เริ่ม (สำหรับ test)
  equippedWeaponId: 'broken_straight_sword',
};

// ===== Get weapon data by ID =====
export function getWeaponById(weaponId: string): WeaponData | undefined {
  return (weaponsData.weapons as WeaponData[]).find((w) => w.id === weaponId);
}

export function getAllWeapons(): WeaponData[] {
  return weaponsData.weapons as WeaponData[];
}

// ===== Hook =====
export function useInventory() {
  const [ownedWeapons, setOwnedWeaponsState] = useState<string[]>(DEFAULT_INVENTORY.ownedWeapons);
  const [equippedWeaponId, setEquippedWeaponIdState] = useState<string>(DEFAULT_INVENTORY.equippedWeaponId);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load from AsyncStorage
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(INVENTORY_KEY);
        if (saved) {
          const parsed: InventoryState = JSON.parse(saved);
          setOwnedWeaponsState(parsed.ownedWeapons || DEFAULT_INVENTORY.ownedWeapons);
          setEquippedWeaponIdState(parsed.equippedWeaponId || DEFAULT_INVENTORY.equippedWeaponId);
        }
      } catch (e) {
        console.error("Failed to load inventory", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  // 2. Save on change
  useEffect(() => {
    if (!isLoaded) return;
    const save = async () => {
      try {
        const state: InventoryState = {
          ownedWeapons,
          equippedWeaponId,
        };
        await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save inventory", e);
      }
    };
    save();
  }, [ownedWeapons, equippedWeaponId, isLoaded]);

  // Actions
  const addWeapon = (weaponId: string) => {
    if (!ownedWeapons.includes(weaponId)) {
      setOwnedWeaponsState((prev) => [...prev, weaponId]);
    }
  };

  const equipWeapon = (weaponId: string) => {
    if (ownedWeapons.includes(weaponId)) {
      setEquippedWeaponIdState(weaponId);
      return true;
    }
    return false;
  };

  const getEquippedWeapon = (): WeaponData | undefined => {
    return getWeaponById(equippedWeaponId);
  };

  const resetInventory = async () => {
    setOwnedWeaponsState(DEFAULT_INVENTORY.ownedWeapons);
    setEquippedWeaponIdState(DEFAULT_INVENTORY.equippedWeaponId);
    await AsyncStorage.removeItem(INVENTORY_KEY);
  };

  return {
    ownedWeapons,
    equippedWeaponId,
    isLoaded,
    addWeapon,
    equipWeapon,
    getEquippedWeapon,
    resetInventory,
  };
}
