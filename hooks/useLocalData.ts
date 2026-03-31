import { useState, useEffect } from "react";
import { BossPattern, EnemyData } from "./useSupabaseData";

// Import JSON data
import mapsData from "../data/maps.json";
import enemiesData from "../data/enemies.json";

// ===== Map Types =====
export interface TileLoot {
  souls: number;
  items: string[];
}

export interface MapTile {
  index: number;
  type: "bonfire" | "path" | "enemy" | "chest" | "event" | "boss";
  name: string;
  icon: string;
  color: string;
  description: string;
  image: string | null;
  canRest: boolean;
  enemyId: string | null;
  loot: TileLoot | null;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  x: string;
  y: string;
  icon: string;
  color: string;
  type: "bonfire" | "enemy" | "boss";
  tiles: MapTile[];
}

// ===== Local Enemy Type (matches JSON structure) =====
export interface LocalEnemyData {
  id: string;
  name: string;
  hp: number;
  damage: number;
  hit_gap: number;
  image_url: string;
  dialogues: string[];
  pattern: BossPattern[];
}

// ===== Hook: Load Map Data =====
export function useMapData(mapId?: string) {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // โหลดข้อมูลจาก JSON (synchronous เพราะเป็น local import)
    const allMaps: GameMap[] = mapsData.maps as GameMap[];
    setMaps(allMaps);

    // ถ้าระบุ mapId ให้หาแมพนั้น ไม่งั้นใช้อันแรก
    if (mapId) {
      const found = allMaps.find((m) => m.id === mapId);
      setCurrentMap(found || allMaps[0] || null);
    } else {
      setCurrentMap(allMaps[0] || null);
    }

    setLoading(false);
    console.log("📦 Map Data Loaded from JSON:", allMaps.length, "maps");
  }, [mapId]);

  return { maps, currentMap, loading };
}

// ===== Hook: Load Enemy Data (replaces useSupabaseData) =====
export function useEnemyData(initialEnemyId?: string) {
  const [enemyId, setEnemyIdState] = useState<string | undefined>(initialEnemyId);
  const [data, setData] = useState<EnemyData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setEnemyId = (id: string) => {
    setEnemyIdState(id);
  };

  useEffect(() => {
    try {
      setLoading(true);
      const allEnemies: LocalEnemyData[] = enemiesData.enemies as LocalEnemyData[];

      if (enemyId) {
        // ดึงเฉพาะ enemy ที่ต้องการ
        const found = allEnemies.find((e) => e.id === enemyId);
        if (found) {
          // แปลงเป็น EnemyData format (ให้ compatible กับ useGameEngine)
          const converted: EnemyData = {
            id: 0, // ไม่จำเป็นต้องใช้ numeric id จาก Supabase แล้ว
            created_at: new Date().toISOString(),
            name: found.name,
            hp: found.hp,
            damage: found.damage,
            hit_gap: found.hit_gap,
            image_url: found.image_url,
            pattern: found.pattern,
          };
          setData([converted]);
          console.log("📦 Enemy Data Loaded from JSON:", found.name);
        } else {
          console.warn("⚠️ Enemy not found in JSON:", enemyId);
          setData([]);
        }
      } else {
        // ดึงทั้งหมด (fallback เป็นตัวแรก)
        const converted: EnemyData[] = allEnemies.map((e, i) => ({
          id: i,
          created_at: new Date().toISOString(),
          name: e.name,
          hp: e.hp,
          damage: e.damage,
          hit_gap: e.hit_gap,
          image_url: e.image_url,
          pattern: e.pattern,
        }));
        setData(converted);
        console.log("📦 All Enemies Loaded from JSON:", converted.length, "enemies");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error loading local enemy data:", err.message);
    } finally {
      setLoading(false);
    }
  }, [enemyId]);

  return { data, loading, error, setEnemyId };
}

// ===== Helper: Get enemy by ID from tile =====
export function getEnemyById(enemyId: string): LocalEnemyData | undefined {
  const allEnemies: LocalEnemyData[] = enemiesData.enemies as LocalEnemyData[];
  return allEnemies.find((e) => e.id === enemyId);
}

// ===== Helper: Get dialogues for an enemy =====
export function getEnemyDialogues(enemyId: string): string[] {
  const enemy = getEnemyById(enemyId);
  return enemy?.dialogues || [
    "\"...\"",
    "\"...\"",
    "\"...\""
  ];
}
