# Tap Souls Architecture Guide

This project has been refactored from a map-based exploration game into a modular **Combat Hub RPG**.

## Core Structure

### 1. Hub System (`/components/hub/`)
The main menu is split into specialized components for better maintainability:
- **`BattleList.tsx`**: Manages encounter selection and lock/unlock logic.
- **`StatusLeveler.tsx`**: Manages character attribute upgrades (Vigor, Strength, Endurance) using Souls.
- **`InventoryScreen.tsx`**: Manages weapon swapping.

### 2. State Management
- **`use-player-state.ts`**: The source of truth for HP, Souls, Stats, and Progress (Defeated boss IDs).
- **`use-game-engine.ts`**: The real-time combat controller. It calculates damage based on player Strength and tracks boss behavior patterns.

### 3. Data Flow
- **Enemies**: Loaded from `data/enemies.json`.
- **Weapons**: Loaded from `data/weapons.json`.
- **Scaling**: 
    - `initialPlayerHp` = `100 + (vigor * 10)`
    - `playerDamage` = `weaponDamage * (strength / 10)`
    - `playerMaxPoise` = `basePoise + endurance`

## Development Tips
- To add a new enemy, simply add a new entry to `data/enemies.json` with a unique `id`.
- To adjust combat difficulty, modify `constants/GameConfig.ts`.
- The combat loop ends by resetting the `screen` state to `HUB` and calling `engine.resetGame()`.

---
*Maintained by Antigravity AI*
