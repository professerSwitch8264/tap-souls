import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import mapsData from '../data/maps.json';
import enemiesData from '../data/enemies.json';

const STORAGE_KEY = '@tap_souls_map_state';

interface MapState {
  currentNodeId: string;
  lastBonfireId: string;
  lastBonfireTileIndex: number;
  unlockedNodes: string[];
  currentTileIndex: number;
  playerHp: number;
  defeatedTiles: Record<string, number[]>; // MapId -> [defeated index1, index2...]
}

const DEFAULT_STATE: MapState = {
  currentNodeId: "firelink_shrine",
  lastBonfireId: "firelink_shrine",
  lastBonfireTileIndex: 0,
  unlockedNodes: ["firelink_shrine"],
  currentTileIndex: 0,
  playerHp: 100,
  defeatedTiles: {},
};

export function useMapEngine() {
  const [currentNodeId, setCurrentNodeIdState] = useState<string>(DEFAULT_STATE.currentNodeId);
  const [lastBonfireId, setLastBonfireIdState] = useState<string>(DEFAULT_STATE.lastBonfireId);
  const [lastBonfireTileIndex, setLastBonfireTileIndexState] = useState<number>(DEFAULT_STATE.lastBonfireTileIndex);
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
            setLastBonfireTileIndexState(parsed.lastBonfireTileIndex ?? DEFAULT_STATE.lastBonfireTileIndex);
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
          lastBonfireTileIndex,
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
  }, [currentNodeId, lastBonfireId, lastBonfireTileIndex, unlockedNodes, currentTileIndex, playerHp, defeatedTiles, isLoaded]);

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
    setLastBonfireTileIndexState(currentTileIndex); // Save which tile the bonfire is at
    setCurrentNodeId(id);
    setPlayerHpState(100);

    // Only reset non-boss defeated tiles (bosses stay dead permanently)
    setDefeatedTilesState((prev) => {
      const currentDefeated = prev[id] || [];
      if (currentDefeated.length === 0) return prev;

      // Find the map data to check which tiles are bosses
      const map = (mapsData.maps as any[]).find((m: any) => m.id === id);
      if (!map) {
        // If we can't find the map, don't reset anything (safe fallback)
        return prev;
      }

      // Keep only boss tile indices in the defeated list
      const bossTileIndices = currentDefeated.filter((tileIdx: number) => {
        const tile = map.tiles[tileIdx];
        if (!tile) return false;

        // Check if this tile's enemy is a boss
        if (tile.type === 'boss') return true;
        if (tile.enemyId) {
          const enemy = (enemiesData.enemies as any[]).find((e: any) => e.id === tile.enemyId);
          return enemy?.isBoss === true;
        }
        return false;
      });

      return { ...prev, [id]: bossTileIndices };
    });

    return true;
  };

  const respawnAtBonfire = () => {
    setCurrentNodeIdState(lastBonfireId);
    setCurrentTileIndexState(lastBonfireTileIndex);
    setPlayerHpState(100);
  };

  const resetMapProgress = async () => {
    setCurrentNodeIdState(DEFAULT_STATE.currentNodeId);
    setLastBonfireIdState(DEFAULT_STATE.lastBonfireId);
    setLastBonfireTileIndexState(DEFAULT_STATE.lastBonfireTileIndex);
    setUnlockedNodesState(DEFAULT_STATE.unlockedNodes);
    setCurrentTileIndexState(DEFAULT_STATE.currentTileIndex);
    setPlayerHpState(DEFAULT_STATE.playerHp);
    setDefeatedTilesState(DEFAULT_STATE.defeatedTiles);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return {
    currentNodeId,
    lastBonfireId,
    lastBonfireTileIndex,
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
