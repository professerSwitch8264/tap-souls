import { WeaponData } from '../hooks/usePlayerState';

export const FRAME_WIDTH = 120;
export const FRAME_HEIGHT = 120;

export const CONFIG = {
  PLAYER: {
    ATTACK: { windUp: 80, active: 120, recovery: 150, damage: 15, bleed: 15, frames: [3, 4, 5], row: 1 },
    DODGE: { windUp: 40, active: 350, recovery: 150, frames: [0, 1, 2], row: 4 },
    BLOCK: { windUp: 150, active: 150, recovery: 200, frames: [0, 1, 2], row: 4 }, // Parry window matches windUp
    STAMINA: { 
      ATTACK: 25, 
      DODGE: 20, 
      BLOCK: 10, 
      REGEN: 18, // per sec
      REGEN_BLOCKING: 6, // per sec
    },
    ESTUS: { MAX_USES: 3, HEAL_PERCENT: 0.4, WINDUP: 1200 },
    STATUS: { BLEED_LIMIT: 100, POISON_LIMIT: 100 },
  },
  BOSS: {
    maxHp: 500,
    idleTime: 1800,
    damage: 25,
    hitGap: 500,
    STATUS: { BLEED_LIMIT: 250, POISON_LIMIT: 250 },
  },
  PARRY_WINDOW: 150, // ms
};

/**
 * Build an attack config from equipped weapon data.
 * Falls back to CONFIG.PLAYER.ATTACK defaults when no weapon is provided.
 */
export function getWeaponAttackConfig(weapon?: WeaponData | null) {
  if (!weapon) return CONFIG.PLAYER.ATTACK;

  return {
    windUp: weapon.windUp,
    active: weapon.active,
    recovery: weapon.recovery,
    damage: weapon.damage,
    critRate: weapon.critRate,
    critMultiplier: weapon.critMultiplier,
    attackSpeed: weapon.attackSpeed,
    bleed: weapon.bleed,
    frames: CONFIG.PLAYER.ATTACK.frames,   // sprite frames stay the same
    row: CONFIG.PLAYER.ATTACK.row,
  };
}
