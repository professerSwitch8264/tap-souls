export const FRAME_WIDTH = 120;
export const FRAME_HEIGHT = 120;

export const CONFIG = {
  PLAYER: {
    ATTACK: { windUp: 80, active: 120, recovery: 150, damage: 15, frames: [3, 4, 5], row: 1 },
    DODGE: { windUp: 40, active: 350, recovery: 150, frames: [0, 1, 2], row: 4 },
  },
  BOSS: {
    maxHp: 500,
    idleTime: 1800,
    damage: 25,
    hitGap: 500,
  },
};
