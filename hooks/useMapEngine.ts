import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = '@tap_souls_map_state';

interface MapState {
  currentNodeId: string;
  lastBonfireId: string;
  unlockedNodes: string[];
  currentTileIndex: number;
  playerHp: number;
  defeatedTiles: Record<string, number[]>; // MapId -> [defeated index1, index2...]
}

const DEFAULT_STATE: MapState = {
  currentNodeId: "firelink_shrine",
  lastBonfireId: "firelink_shrine",
  unlockedNodes: ["firelink_shrine"],
  currentTileIndex: 0,
  playerHp: 100,
  defeatedTiles: {},
};

export function useMapEngine() {
  const [currentNodeId, setCurrentNodeIdState] = useState<string>(DEFAULT_STATE.currentNodeId);
  const [lastBonfireId, setLastBonfireIdState] = useState<string>(DEFAULT_STATE.lastBonfireId);
  const [unlockedNodes, setUnlockedNodesState] = useState<string[]>(DEFAULT_STATE.unlockedNodes);
  const [currentTileIndex, setCurrentTileIndexState] = useState<number>(DEFAULT_STATE.currentTileIndex);
  const [playerHp, setPlayerHpState] = useState<number>(DEFAULT_STATE.playerHp);
  const [defeatedTiles, setDefeatedTilesState] = useState<Record<string, number[]>>(DEFAULT_STATE.defeatedTiles);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);

          // Migration: ถ้าข้อมูลเก่าใช้ตัวเลข (เช่น currentNodeId = 1) → reset เป็น default
          const isOldFormat = typeof parsed.currentNodeId === 'number' ||
            (parsed.unlockedNodes && parsed.unlockedNodes.length > 0 && typeof parsed.unlockedNodes[0] === 'number');

          if (isOldFormat) {
            console.log("🔄 Migrating old map data format → resetting to defaults");
            await AsyncStorage.removeItem(STORAGE_KEY);
            // Use defaults (don't set anything, they're already default)
          } else {
            setCurrentNodeIdState(parsed.currentNodeId || DEFAULT_STATE.currentNodeId);
            setLastBonfireIdState(parsed.lastBonfireId || DEFAULT_STATE.lastBonfireId);
            setUnlockedNodesState(parsed.unlockedNodes || DEFAULT_STATE.unlockedNodes);
            setCurrentTileIndexState(parsed.currentTileIndex ?? DEFAULT_STATE.currentTileIndex);
            setPlayerHpState(parsed.playerHp ?? DEFAULT_STATE.playerHp);
            setDefeatedTilesState(parsed.defeatedTiles || DEFAULT_STATE.defeatedTiles);
          }
        }
      } catch (e) {
        console.error("Failed to load map state", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // 2. Save anytime these values change
  useEffect(() => {
    if (!isLoaded) return;
    const saveState = async () => {
      try {
        const stateToSave: MapState = {
          currentNodeId,
          lastBonfireId,
          unlockedNodes,
          currentTileIndex,
          playerHp,
          defeatedTiles,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Failed to save map state", e);
      }
    };
    saveState();
  }, [currentNodeId, lastBonfireId, unlockedNodes, currentTileIndex, playerHp, defeatedTiles, isLoaded]);

  // Actions
  const setCurrentNodeId = (id: string) => {
    setCurrentNodeIdState(id);
    if (!unlockedNodes.includes(id)) {
      setUnlockedNodesState((prev) => [...prev, id]);
    }
  };

  const moveToNextTile = () => {
    setCurrentTileIndexState((prev) => prev + 1);
  };

  const moveToPreviousTile = () => {
    setCurrentTileIndexState((prev) => Math.max(0, prev - 1));
  };

  const setPlayerHp = (hp: number) => {
    setPlayerHpState(hp);
  };

  const markTileDefeated = (mapId: string, tileIndex: number) => {
    setDefeatedTilesState((prev) => {
      const current = prev[mapId] || [];
      if (current.includes(tileIndex)) return prev;
      return { ...prev, [mapId]: [...current, tileIndex] };
    });
  };

  const resetDefeatedTiles = (mapId: string) => {
    setDefeatedTilesState((prev) => ({ ...prev, [mapId]: [] }));
  };

  const restAtBonfire = (id: string) => {
    setLastBonfireIdState(id);
    setCurrentNodeId(id);
    setPlayerHpState(100);
    resetDefeatedTiles(id);
    return true; 
  };

  const respawnAtBonfire = () => {
    setCurrentNodeIdState(lastBonfireId);
  };

  const resetMapProgress = async () => {
    setCurrentNodeIdState(DEFAULT_STATE.currentNodeId);
    setLastBonfireIdState(DEFAULT_STATE.lastBonfireId);
    setUnlockedNodesState(DEFAULT_STATE.unlockedNodes);
    setCurrentTileIndexState(DEFAULT_STATE.currentTileIndex);
    setPlayerHpState(DEFAULT_STATE.playerHp);
    setDefeatedTilesState(DEFAULT_STATE.defeatedTiles);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return {
    currentNodeId,
    lastBonfireId,
    unlockedNodes,
    currentTileIndex,
    playerHp,
    defeatedTiles,
    isLoaded,
    setCurrentNodeId,
    setCurrentTileIndex: setCurrentTileIndexState,
    moveToNextTile,
    moveToPreviousTile,
    setPlayerHp,
    markTileDefeated,
    restAtBonfire,
    respawnAtBonfire,
    resetMapProgress,
  };
}
