import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
  Directions,
} from "react-native-gesture-handler";

import { FloatingDamage } from "../components/game/FloatingDamage";
import { HubScreen } from "../components/game/HubScreen";
import { ProfileButton } from "../components/ui/ProfileButton";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../constants/GameConfig";
import { useGameEngine } from "../hooks/useGameEngine";
import { usePlayerState } from "../hooks/usePlayerState";
import { useEnemyData } from "../hooks/useLocalData";

import { ENEMY_IMAGES, HERO_IMAGES } from "../constants/ImageRegistry";

// Screen types: HUB (main menu), COMBAT (fighting)
type GameScreenType = "HUB" | "COMBAT";

export default function GameScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState<GameScreenType>("HUB");
  const [currentEnemyId, setCurrentEnemyId] = useState<string>("lizard_soldier");
  const [pendingCombat, setPendingCombat] = useState(false);

  const {
    data: enemyData,
    loading: enemyLoading,
    setEnemyId,
  } = useEnemyData(currentEnemyId);

  const playerState = usePlayerState();
  const equippedWeapon = playerState.getEquippedWeapon() || null;

  const engine = useGameEngine(
    enemyData, 
    enemyLoading, 
    playerState.hp, 
    equippedWeapon, 
    { ...playerState.stats, maxHp: playerState.maxHp }
  );

  // When combat is won → reward player and return to HUB
  useEffect(() => {
    if (engine.gameState === "WON") {
      const timer = setTimeout(() => {
        playerState.markEnemyDefeated(currentEnemyId);
        // Find the enemy in the list to get its soul reward
        const souls = enemyData?.[0]?.souls || 50;
        playerState.gainSouls(souls);
        playerState.setPlayerHp(engine.pHp);
        engine.resetGame();
        setScreen("HUB");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [engine.gameState, currentEnemyId, enemyData]);

  // Sync HP after damage
  useEffect(() => {
    if (engine.pHp !== playerState.hp) {
      playerState.setPlayerHp(engine.pHp);
    }
  }, [engine.pHp]);

  // Watch for combat readiness
  useEffect(() => {
    if (pendingCombat && screen === "COMBAT") {
      const timer = setTimeout(() => {
        engine.triggerEncounter();
        setPendingCombat(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingCombat, screen]);

  // Handle Flee
  useEffect(() => {
    if (engine.fleeProgress >= 100) {
      engine.resetGame();
      setScreen("HUB");
    }
  }, [engine.fleeProgress]);

  const handleStartCombat = (enemyId: string) => {
    setCurrentEnemyId(enemyId);
    setEnemyId(enemyId);
    setScreen("COMBAT");
    setPendingCombat(true);
  };

  const handleAttack = () => engine.handleAction("ATTACK");
  const handleDodge = (direction: "LEFT" | "RIGHT") => engine.handleAction("DODGE", direction);

  // Gesture Handlers
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (engine.gameState !== "PLAYING" || engine.isLocked) return;
      handleAttack();
    })
    .runOnJS(true);

  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      handleDodge("LEFT");
    })
    .runOnJS(true);

  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      handleDodge("RIGHT");
    })
    .runOnJS(true);

  // Combine gestures
  const composedGesture = Gesture.Exclusive(swipeLeft, swipeRight, tapGesture);

  const bgInterpolation = engine.isEnraged ? "#2a0000" : "#000000";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>

        {/* ===== HUB SCREEN ===== */}
        {screen === "HUB" && (
          <HubScreen 
            player={playerState}
            onSelectEnemy={handleStartCombat}
          />
        )}

        {/* ===== COMBAT SCREEN ===== */}
        {screen === "COMBAT" && engine.gameState !== "LOADING" && (
          <View style={styles.container}>

            {/* Cinematic Boss HUD (Top Center) */}
            <View style={styles.bossHUD}>
              <Text style={styles.bossTitle}>{engine.bossName.toUpperCase()}</Text>
              <View style={styles.bossBarContainer}>
                {/* Boss HP Bar */}
                <View style={styles.bossHPBarBg}>
                  <Animated.View
                    style={[
                      styles.bossCatchUp,
                      {
                        width: engine.bCatchUp.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bossHPBarFill,
                      { width: `${Math.min(100, Math.max(0, (engine.bHp / engine.bMaxHp) * 100))}%` },
                    ]}
                  />
                </View>

                {/* Boss Poise Bar */}
                <View style={styles.bossPoiseBarBg}>
                  <View
                    style={[
                      styles.bossPoiseBarFill,
                      { width: `${Math.min(100, Math.max(0, (engine.bPoise / engine.bMaxPoise) * 100))}%` },
                    ]}
                  />
                </View>

                {/* Boss Status Row */}
                <View style={[styles.statusRow, { justifyContent: 'center' }]}>
                  {engine.bBleed > 0 && (
                    <View style={styles.statusIcon}>
                      <FontAwesome5 name="tint" size={8} color="#ff1100" />
                      <View style={[styles.statusMiniBar, { width: (engine.bBleed / 250) * 40, backgroundColor: '#ff1100' }]} />
                    </View>
                  )}
                  {engine.bPoison > 0 && (
                    <View style={styles.statusIcon}>
                      <FontAwesome5 name="skull" size={8} color="#a64dff" />
                      <View style={[styles.statusMiniBar, { width: (engine.bPoison / 250) * 40, backgroundColor: '#a64dff' }]} />
                    </View>
                  )}
                </View>
              </View>
            </View>

            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={[
                  styles.battleZone,
                  { transform: [{ translateX: engine.shakeX }] },
                ]}
              >
              {/* Witch Time / SlowMo Overlay */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(50,150,255,0.1)",
                    opacity: engine.slowMoOverlay,
                    zIndex: 0,
                  },
                ]}
                pointerEvents="none"
              />

              {/* Boss Sprite Section */}
              <View style={styles.bossSpriteContainer}>
                <View style={styles.feedbackContainer}>
                  {engine.feedbacks
                    .filter((f) => f.target === "BOSS")
                    .map((f) => (
                      <FloatingDamage key={f.id} text={f.text} type={f.type} />
                    ))}
                </View>

                <Animated.View
                  style={[
                    styles.bossBody,
                    { 
                      transform: [
                        { translateY: engine.bY },
                        { scale: engine.bossScale }
                      ],
                      opacity: engine.bossOpacity
                    },
                  ]}
                >
                  <Image
                    source={
                      engine.currentBossImage && ENEMY_IMAGES[engine.currentBossImage]
                        ? ENEMY_IMAGES[engine.currentBossImage]
                        : engine.currentBossImage
                          ? { uri: engine.currentBossImage }
                          : ENEMY_IMAGES["gundyr.png"]
                    }
                    style={[styles.fullImg, engine.isEnraged && { tintColor: "#ffbbbb" }]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>

              {/* Player Sprite Section */}
              <View style={styles.playerContainer}>
                <View style={styles.feedbackContainer}>
                  {engine.feedbacks
                    .filter((f) => f.target === "PLAYER")
                    .map((f) => (
                      <FloatingDamage key={f.id} text={f.text} type={f.type} />
                    ))}
                </View>

                <Animated.View
                  style={[
                    styles.spriteWindow,
                    {
                      transform: [
                        { translateY: engine.pY },
                        { translateX: engine.pX },
                        { scale: engine.pScale },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={HERO_IMAGES.ashenOne}
                    style={[
                      styles.spritesheet,
                      {
                        left: -engine.frameX * FRAME_WIDTH,
                        top: -engine.frameY * (719 / 6),
                      },
                    ]}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </GestureDetector>

            {/* Combo Counter Overlay */}
            {engine.combo > 1 && (
              <Text style={styles.comboText}>{engine.combo} HITS</Text>
            )}

            {/* Ergonomic Bottom HUD */}
            <View style={styles.bottomHUD}>
              {/* Player Mini Stats */}
              <View style={styles.statsHUD}>
                <View style={styles.statBarWrapper}>
                   <View style={[styles.healthFill, { width: `${(engine.pHp / playerState.maxHp) * 100}%` }]} />
                </View>
                <View style={styles.statBarWrapper}>
                   <View style={[styles.staminaFill, { width: `${(engine.pStamina / 120) * 100}%` }]} />
                </View>
                {engine.tension > 0 && (
                   <View style={[styles.statBarWrapper, { height: 2 }]}>
                      <View style={[styles.tensionFill, { width: `${engine.tension}%` }]} />
                   </View>
                )}
              </View>

              {/* Action Buttons Grid */}
              <View style={[styles.actionGrid, { justifyContent: 'space-around' }]}>
                {/* Utility: Heal */}
                <TouchableOpacity 
                  style={[styles.subActionBtn, engine.estus <= 0 && styles.disabledBtn]} 
                  onPress={() => engine.handleAction("HEAL")}
                  disabled={engine.isLocked || engine.estus <= 0}
                >
                  <FontAwesome5 name="flask" size={16} color="#4caf50" />
                  <Text style={{ color: '#4caf50', fontSize: 8, fontWeight: 'bold' }}>{engine.estus}</Text>
                </TouchableOpacity>

                {/* Fire Button (Skill/Weapon Art) - High Damage & Poise Damage */}
                <TouchableOpacity 
                  style={[styles.subActionBtn, { borderColor: '#ff9800' }, engine.tension < 100 && styles.disabledBtn]} 
                  onPress={() => engine.handleAction("SKILL")}
                  disabled={engine.isLocked || engine.tension < 100}
                >
                  <FontAwesome5 name="fire-alt" size={18} color="#ff9800" />
                  {engine.tension < 100 && <Text style={{ color: '#ff9800', fontSize: 7, fontWeight: 'bold' }}>{engine.tension}%</Text>}
                </TouchableOpacity>

                {/* Flee */}
                {engine.fleeDifficulty > 0 && (
                   <Pressable
                      style={({ pressed }) => [
                        styles.fleeCircle,
                        (pressed || engine.isFleeing) && styles.fleeCircleActive
                      ]}
                      onPressIn={() => engine.setIsFleeing(true)}
                      onPressOut={() => engine.setIsFleeing(false)}
                    >
                      <View style={[styles.fleeFill, { height: `${engine.fleeProgress}%` }]} />
                      <FontAwesome5 name="running" size={16} color={engine.isFleeing ? "#ff9800" : "#555"} />
                      <Text style={[styles.fleeText, { fontSize: 8 }]}>FLEE</Text>
                   </Pressable>
                )}
              </View>
            </View>

            {/* Flash Effect Overlay */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: "white", opacity: engine.flashOp }]}
              pointerEvents="none"
            />

            {/* Countdown Overlay */}
            {engine.gameState === "COUNTDOWN" && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>
                  {engine.countdown > 0 ? engine.countdown : "GO!"}
                </Text>
              </View>
            )}
          </View>
        )}

        {screen === "COMBAT" && engine.gameState === "LOADING" && (
          <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color="#ff4444" />
            <Text style={styles.loadingScreenText}>PREPARING BATTLE...</Text>
          </View>
        )}
      </View>

      <Modal visible={engine.gameState === "LOST"} transparent animationType="fade">
        <View style={styles.modal}>
          <Text style={styles.modalText}>YOU DIED</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              engine.resetGame();
              playerState.restAtBonfire();
              setScreen("HUB");
            }}
          >
            <Text style={styles.retryText}>REST AT HUB</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  battleZone: { flex: 1, zIndex: 1, paddingTop: 60 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  loadingScreenText: { color: "#ff4444", marginTop: 20, fontWeight: "bold", letterSpacing: 2 },
  
  // Cinematic Boss HUD (Top)
  bossHUD: {
    position: 'absolute',
    top: 110, // Move down to avoid top-left profile bar overlap
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  bossTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(255,0,0,0.5)',
    textShadowRadius: 10,
  },
  bossBarContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 4,
  },
  bossHPBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.2)',
  },
  bossHPBarFill: {
    height: '100%',
    backgroundColor: '#e53935',
  },
  bossPoiseBarBg: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 1,
    overflow: 'hidden',
    width: '60%',
    alignSelf: 'center',
  },
  bossPoiseBarFill: {
    height: '100%',
    backgroundColor: '#ffca28',
  },
  bossCatchUp: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Battle Arena
  bossSpriteContainer: {
    alignItems: 'center',
    marginTop: 100, // Sync with bossHUD move
  },
  bossBody: {
    width: 280,
    height: 280,
  },
  playerContainer: {
    position: 'absolute',
    bottom: 160, // Lower the player to avoid boss overlap
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  spriteWindow: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: 'hidden',
  },
  spritesheet: { width: 1080, height: 719, position: 'absolute' },

  // Ergonomic Bottom HUD
  bottomHUD: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 1000,
  },
  statsHUD: {
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  statBarWrapper: {
    width: '100%',
    maxWidth: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  healthFill: { height: '100%', backgroundColor: '#ff5252' },
  staminaFill: { height: '100%', backgroundColor: '#4caf50' },
  tensionFill: { height: '100%', backgroundColor: '#ffca28' },

  actionGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  leftGroup: {
    width: 80,
    gap: 12,
    alignItems: 'center',
  },
  centerGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  // Buttons
  mainActionBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderWidth: 2,
    borderColor: '#ff5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallActionBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.2,
  },
  
  // Status Icons (HUD)
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusMiniBar: {
    height: 3,
    borderRadius: 1.5,
  },

  // Flee Circle
  fleeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fleeCircleActive: {
    borderColor: '#ff9800',
  },
  fleeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,152,0,0.3)',
  },
  fleeText: {
    color: '#aaa',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 2,
  },

  // Overlays & Feedback
  topHud: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1000,
  },
  feedbackContainer: {
    position: 'absolute', // Now relative to the sprite it belongs to
    top: -40,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 1000,
  },
  countdownText: {
    color: "#fff",
    fontSize: 100,
    fontWeight: "bold",
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowRadius: 20,
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalText: {
    color: "#ff1100",
    fontSize: 48,
    fontWeight: "bold",
    letterSpacing: 10,
    textShadowColor: '#f00',
    textShadowRadius: 20,
    marginBottom: 40,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 4,
  },
  retryText: { color: "#fff", fontWeight: "bold", letterSpacing: 3, fontSize: 12 },
  fullImg: { width: "100%", height: "100%" },
  comboText: {
    position: 'absolute',
    bottom: 240, // Positioned above the player and HUD
    left: 20,
    color: '#ffea00',
    fontSize: 22,
    fontWeight: 'bold',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
    zIndex: 50,
  },
});
