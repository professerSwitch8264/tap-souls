/**
 * Central Image Registry - Pre-loads ALL game images at startup
 * ทุกรูปในเกมจะถูกโหลดไว้ที่นี่ ไม่ต้องโหลดตอนใช้งาน
 */

// ===== Enemy / Boss Images =====
export const ENEMY_IMAGES: Record<string, any> = {
  "gundyr.png": require("@/assets/images/enemy/gundyr.png"),
  "lizard.png": require("@/assets/images/enemy/lizard.png"),
};

// ===== Resource / Environment Images =====
export const RESOURCE_IMAGES: Record<string, any> = {
  "resourse/bonfire.png": require("@/assets/images/resourse/bonfire.png"),
};

// ===== Hero Images =====
export const HERO_IMAGES = {
  ashenOne: require("@/assets/images/hero/ashen-one.png"),
};

// ===== Combined lookup: finds image from any registry =====
export function getGameImage(key: string | null | undefined): any | null {
  if (!key) return null;
  return ENEMY_IMAGES[key] || RESOURCE_IMAGES[key] || null;
}

// ===== Get enemy image by enemy ID (looks up from enemies.json data) =====
import enemiesData from "../data/enemies.json";

export function getEnemyImageByEnemyId(enemyId: string): any | null {
  const enemy = enemiesData.enemies.find((e) => e.id === enemyId);
  if (!enemy) return null;
  const imageKey = enemy.image_url;
  return ENEMY_IMAGES[imageKey] || null;
}
