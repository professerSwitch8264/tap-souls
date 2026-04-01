import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
          <View style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: bgInterpolation }]}>
              <View style={styles.topHud}>
                <ProfileButton hp={engine.pHp} poise={engine.pPoise} maxPoise={50} />
              </View>

              <Animated.View
                style={[
                  styles.battleZone,
                  { transform: [{ translateX: engine.shakeX }] },
                ]}
              >
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: "rgba(50,150,255,0.15)",
                      opacity: engine.slowMoOverlay,
                      zIndex: 0,
                    },
                  ]}
                  pointerEvents="none"
                />

                <View style={[styles.bossBox, { marginTop: 20 }]}>
                  <Text style={[styles.bossTitle, engine.isEnraged && { color: "#ff4444" }]}>
                    {engine.bossName}
                  </Text>

                  <View style={styles.barContainer}>
                    <View style={styles.barBG}>
                      <Animated.View
                        style={[
                          styles.catchUpBar,
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
                          styles.bossHP,
                          { width: `${Math.min(100, Math.max(0, (engine.bHp / engine.bMaxHp) * 100))}%` },
                        ]}
                      />
                    </View>

                    <View style={[styles.barBG, { height: 4, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <View
                        style={[
                          styles.bossPoise,
                          { width: `${Math.min(100, Math.max(0, (engine.bPoise / engine.bMaxPoise) * 100))}%` },
                        ]}
                      />
                    </View>
                  </View>

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

              <View style={styles.hud}>
                {engine.combo > 1 && (
                  <Text style={styles.comboText}>{engine.combo} HITS COMBO!</Text>
                )}

                {engine.fleeDifficulty > 0 && (
                  <View style={styles.fleeContainer}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.fleeCircle,
                        (pressed || engine.isFleeing) && styles.fleeCircleActive
                      ]}
                      onPressIn={() => engine.setIsFleeing(true)}
                      onPressOut={() => engine.setIsFleeing(false)}
                    >
                      <View style={[styles.fleeFill, { height: `${engine.fleeProgress}%` }]} />
                      <View style={styles.fleeContent}>
                        <FontAwesome5 name="running" size={24} color={engine.isFleeing ? "#ff9800" : "#eee"} />
                        <Text style={styles.fleeText}>
                          {engine.isFleeing ? "FLEEING" : "FLEE"}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                )}

                <View style={styles.actionContainer}>
                  <TouchableOpacity 
                    style={[styles.smallBtn, engine.isLocked && styles.btnDisabled]} 
                    onPress={() => handleDodge("LEFT")}
                    disabled={engine.isLocked}
                  >
                    <FontAwesome5 name="undo-alt" size={24} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.mainBtn, engine.isLocked && styles.btnDisabled]} 
                    onPress={handleAttack}
                    disabled={engine.isLocked}
                  >
                    <FontAwesome5 name="hand-rock" size={48} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: "white", opacity: engine.flashOp }]}
                pointerEvents="none"
              />

              {engine.gameState === "COUNTDOWN" && (
                <View style={styles.countdownOverlay}>
                  <Text style={styles.countdownText}>
                    {engine.countdown > 0 ? engine.countdown : "GO!"}
                  </Text>
                </View>
              )}
            </View>
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
  container: { flex: 1, paddingTop: 20, paddingHorizontal: 20 },
  battleZone: { flex: 1, zIndex: 1 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  loadingScreenText: { color: "#ff4444", marginTop: 20, fontWeight: "bold", letterSpacing: 2 },
  bossBox: { marginTop: 10, alignItems: "center", position: "relative" },
  bossTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 2,
  },
  barContainer: { width: "100%", paddingHorizontal: 20 },
  barBG: {
    height: 8,
    backgroundColor: "#222",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  fleeContainer: {
    position: 'absolute',
    left: 10,
    bottom: 20,
    alignItems: 'center',
    zIndex: 30,
  },
  fleeCircle: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(30,30,30,0.8)',
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fleeCircleActive: {
    borderColor: '#ff9800',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  fleeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,152,0,0.4)',
  },
  fleeContent: { alignItems: 'center' },
  fleeText: {
    color: '#eee',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
    marginBottom: 5,
  },
  mainBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(230,0,0,0.3)',
    borderWidth: 3,
    borderColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  smallBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
    borderColor: '#333',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  catchUpBar: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#ffca28",
  },
  bossHP: { height: "100%", backgroundColor: "#e53935", position: "absolute" },
  bossPoise: { height: "100%", backgroundColor: "#ffd740", position: "absolute" },
  bossBody: { width: 300, height: 300 },
  fullImg: { width: "100%", height: "100%" },
  playerContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 100,
    position: "relative",
  },
  spriteWindow: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: "hidden",
  },
  spritesheet: { width: 1080, height: 719, position: "absolute" },
  hud: { position: "absolute", bottom: 30, left: 20, right: 20, zIndex: 2 },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 50,
  },
  comboText: {
    color: "#ffea00",
    fontSize: 18,
    fontWeight: "bold",
    fontStyle: "italic",
    marginBottom: 10,
    textAlign: 'center',
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalText: {
    color: "#ff1100",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    letterSpacing: 3,
  },
  retryBtn: {
    padding: 15,
    borderWidth: 1,
    borderColor: "white",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  retryText: { color: "white", fontWeight: "bold", letterSpacing: 2 },
  feedbackContainer: {
    position: "absolute",
    top: 50,
    zIndex: 10,
    alignItems: "center",
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 100,
  },
  countdownText: {
    color: "#fff",
    fontSize: 120,
    fontWeight: "bold",
  },
});
