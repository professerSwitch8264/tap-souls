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
  Directions,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import { FloatingDamage } from "../components/game/FloatingDamage";
import { MapScreen } from "../components/game/MapScreen";
import { WalkingZone } from "../components/game/WalkingZone";
import { ProfileButton } from "../components/ui/ProfileButton";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../constants/GameConfig";
import { useGameEngine } from "../hooks/useGameEngine";
import { useEnemyData, useMapData, getEnemyById } from "../hooks/useLocalData";
import { useMapEngine } from "../hooks/useMapEngine";

import { ENEMY_IMAGES, HERO_IMAGES } from "../constants/ImageRegistry";

// Screen types: MAP (world map), EXPLORING (walking in a map), COMBAT (fighting)
type GameScreenType = "MAP" | "EXPLORING" | "COMBAT";

export default function GameScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState<GameScreenType>("MAP");
  const [currentEnemyId, setCurrentEnemyId] = useState<string>("gundyr");
  const [pendingCombat, setPendingCombat] = useState(false);

  const {
    data: enemyData,
    loading: enemyLoading,
    error: enemyError,
    setEnemyId,
  } = useEnemyData(currentEnemyId);

  const mapEngine = useMapEngine();
  const engine = useGameEngine(enemyData, enemyLoading, mapEngine.playerHp);
  const { currentMap, loading: mapLoading } = useMapData(mapEngine.currentNodeId);

  // When combat is won → go back to exploring (next tile)
  useEffect(() => {
    if (engine.gameState === "WON") {
      const timer = setTimeout(() => {
        mapEngine.markTileDefeated(mapEngine.currentNodeId, mapEngine.currentTileIndex);
        mapEngine.setPlayerHp(engine.pHp);
        engine.resetGame();
        setScreen("EXPLORING");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [engine.gameState]);

  // Sync HP after damage or fight ends
  useEffect(() => {
    if (engine.pHp !== mapEngine.playerHp) {
      mapEngine.setPlayerHp(engine.pHp);
    }
  }, [engine.pHp]);

  // Watch for combat readiness: trigger encounter AFTER engine finishes re-initializing
  useEffect(() => {
    if (pendingCombat && screen === "COMBAT") {
      // Delay to ensure data loading + engine re-init effects have fully completed
      const timer = setTimeout(() => {
        engine.triggerEncounter();
        setPendingCombat(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingCombat, screen]);

  // Handle Flee Success
  useEffect(() => {
    if (engine.fleeProgress >= 100) {
      engine.resetGame();
      setScreen("MAP");
    }
  }, [engine.fleeProgress]);

  // Handle entering combat from a tile
  const handleStartCombat = (enemyId?: string) => {
    if (enemyId) {
      setCurrentEnemyId(enemyId);
      setEnemyId(enemyId);
    }
    setScreen("COMBAT");
    setPendingCombat(true); // Don't call triggerEncounter directly, wait for data to be ready
  };

  // Handle map complete (walked past last tile)
  const handleMapComplete = () => {
    setScreen("MAP");
  };

  // Handle returning to map (from exploring)
  const handleReturnToMap = () => {
    setScreen("MAP");
  };

  // Handle selecting a node from the world map
  const handleSelectNode = (node: any) => {
    mapEngine.setCurrentNodeId(node.id);
    mapEngine.setCurrentTileIndex(0);
    engine.resetGame();
    setScreen("EXPLORING");
  };

  // Actions (Now button-based)
  const handleAttack = () => engine.handleAction("ATTACK");
  const handleDodge = (direction: "LEFT" | "RIGHT") => engine.handleAction("DODGE", direction);

  const bgInterpolation = engine.isEnraged ? "#2a0000" : "#000000";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>

        {/* ===== WORLD MAP SCREEN ===== */}
        {screen === "MAP" && (
          <MapScreen
            currentNodeId={mapEngine.currentNodeId}
            unlockedNodes={mapEngine.unlockedNodes}
            lastBonfireId={mapEngine.lastBonfireId}
            onSelectNode={handleSelectNode}
          />
        )}

        {/* ===== EXPLORING SCREEN (Walking through tiles) ===== */}
        {screen === "EXPLORING" && (
          <WalkingZone
            tiles={currentMap?.tiles || []}
            currentTileIndex={mapEngine.currentTileIndex}
            moveToNextTile={mapEngine.moveToNextTile}
            moveToPreviousTile={mapEngine.moveToPreviousTile}
            defeatedTiles={mapEngine.defeatedTiles[mapEngine.currentNodeId] || []}
            hp={mapEngine.playerHp}
            onEncounter={handleStartCombat}
            onRest={() => {
              mapEngine.restAtBonfire(mapEngine.currentNodeId);
              engine.healPlayer();
            }}
            onMapComplete={handleMapComplete}
            onReturnToMap={handleReturnToMap}
            mapName={currentMap?.name || "UNKNOWN"}
          />
        )}

        {/* ===== COMBAT SCREEN ===== */}
        {screen === "COMBAT" && engine.gameState !== "LOADING" && (
          <View style={{ flex: 1 }}>
            <View
              style={[styles.container, { backgroundColor: bgInterpolation }]}
            >
              <View style={styles.topHud}>
                <ProfileButton hp={engine.pHp} />
              </View>

              <Animated.View
                style={[
                  styles.battleZone,
                  { transform: [{ translateX: engine.shakeX }] },
                ]}
              >
                {/* Witch Time Overlay */}
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

                {/* Boss Section */}
                <View style={[styles.bossBox, { marginTop: 20 }]}>
                  <Text
                    style={[
                      styles.bossTitle,
                      engine.isEnraged && {
                        color: "#ff4444",
                        ...Platform.select({
                          web: { textShadow: "0px 0px 10px #f00" } as any,
                          default: {
                            textShadowColor: "#f00",
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 10,
                          },
                        }),
                      },
                    ]}
                  >
                    {engine.bossName} - {engine.bossAction}
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
                          {
                            width: `${Math.min(100, Math.max(0, (engine.bHp / engine.bMaxHp) * 100))}%`,
                          },
                        ]}
                      />
                    </View>

                    <View style={[styles.barBG, { height: 4, marginTop: 4, backgroundColor: '#333' }]}>
                      <Animated.View
                        style={{
                          height: '100%',
                          backgroundColor: 'white',
                          width: engine.bCooldown.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                          })
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.feedbackContainer}>
                    {engine.feedbacks
                      .filter((f) => f.target === "BOSS")
                      .map((f) => (
                        <FloatingDamage
                          key={f.id}
                          text={f.text}
                          type={f.type}
                        />
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
                      style={[
                        styles.fullImg,
                        engine.isEnraged && { tintColor: "#ffbbbb" },
                      ]}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>

                {/* Player Section */}
                <View style={styles.playerContainer}>
                  <View style={styles.feedbackContainer}>
                    {engine.feedbacks
                      .filter((f) => f.target === "PLAYER")
                      .map((f) => (
                        <FloatingDamage
                          key={f.id}
                          text={f.text}
                          type={f.type}
                        />
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

              {/* HUD Section */}
              <View style={styles.hud}>
                {engine.combo > 1 && (
                  <Text
                    style={[
                      styles.comboText,
                      Platform.select({
                        web: { textShadow: "0px 0px 5px #ffa000" } as any,
                        default: {
                          textShadowColor: "#ffa000",
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 5,
                        },
                      }),
                    ]}
                  >
                    {engine.combo} HITS COMBO!
                  </Text>
                )}

                {/* Flee Button - Bottom Left */}
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
                      <View 
                        style={[
                          styles.fleeFill, 
                          { height: `${engine.fleeProgress}%` }
                        ]} 
                      />
                      <View style={styles.fleeContent}>
                        <FontAwesome5 name="running" size={24} color={engine.isFleeing ? "#ff9800" : "#eee"} />
                        <Text style={styles.fleeText}>
                          {engine.isFleeing ? "FLEEING" : "FLEE"}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* COMBAT ACTIONS - Bottom Right */}
                <View style={styles.actionContainer}>
                  {/* Dodge (Left Only) */}
                  <TouchableOpacity 
                    style={[styles.smallBtn, engine.isLocked && styles.btnDisabled]} 
                    activeOpacity={0.7}
                    onPress={() => handleDodge("LEFT")}
                    disabled={engine.isLocked}
                  >
                    <FontAwesome5 name="undo-alt" size={24} color="white" />
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold', marginTop: 4 }}>DODGE</Text>
                  </TouchableOpacity>

                  {/* Attack Button */}
                  <TouchableOpacity 
                    style={[styles.mainBtn, engine.isLocked && styles.btnDisabled]} 
                    activeOpacity={0.7}
                    onPress={handleAttack}
                    disabled={engine.isLocked}
                  >
                    <View style={styles.attackInner}>
                      <FontAwesome5 name="hand-rock" size={48} color="white" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Screen Flash Overlay */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "white", opacity: engine.flashOp },
                ]}
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
          </View>
        )}

        {/* LOADING SCREEN OVERLAY */}
        {screen === "COMBAT" && engine.gameState === "LOADING" && (
          <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color="#ff4444" />
            <Text style={styles.loadingScreenText}>PREPARING BATTLE...</Text>
          </View>
        )}
      </View>

      {/* YOU DIED Modal */}
      <Modal
        visible={engine.gameState === "LOST"}
        transparent
        animationType="fade"
      >
        <View style={styles.modal}>
          <Text
            style={[
              styles.modalText,
              Platform.select({
                web: { textShadow: "0px 0px 10px #f00" } as any,
                default: {
                  textShadowColor: "#f00",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                },
              }),
            ]}
          >
            YOU DIED
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              engine.resetGame();
              mapEngine.respawnAtBonfire();
              mapEngine.setCurrentTileIndex(0);
              setScreen("MAP");
            }}
          >
            <Text style={styles.retryText}>RESPAWN AT BONFIRE</Text>
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
  barBGHud: {
    height: 16,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#555",
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
  fleeContent: {
    alignItems: 'center',
  },
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
    elevation: 10,
    shadowColor: '#f00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  attackInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  statRow: { flexDirection: "row", alignItems: "center" },
  label: { color: "white", fontSize: 14, width: 35, fontWeight: "bold" },
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
    ...Platform.select({
      web: { textShadow: "0px 0px 20px #ff4444" } as any,
      default: {
        textShadowColor: "#ff4444",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
      },
    }),
  },
});
