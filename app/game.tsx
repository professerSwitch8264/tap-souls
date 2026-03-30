import { useRouter } from "expo-router";
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
} from "react-native";
import {
  Directions,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import { FloatingDamage } from "../components/game/FloatingDamage";
import { InventoryScreen } from "../components/game/InventoryScreen";
import { MapScreen } from "../components/game/MapScreen";
import { BottomNavbar } from "../components/ui/BottomNavbar";
import { ProfileButton } from "../components/ui/ProfileButton";
import { CONFIG, FRAME_HEIGHT, FRAME_WIDTH } from "../constants/GameConfig";
import { useGameEngine } from "../hooks/useGameEngine";

import { useSupabaseData } from "../hooks/useSupabaseData";

const GundyrImg = require("@/assets/images/enemy/gundyr.png");
const HeroImg = require("@/assets/images/hero/ashen-one.png");

// Image Dictionary for Local Assets mapped from Cloud Strings
const BOSS_IMAGES: Record<string, any> = {
  "gundyr.png": require("@/assets/images/enemy/gundyr.png"),
};

export default function GameScreen() {
  const router = useRouter();
  const {
    data: supabaseData,
    loading: supabaseLoading,
    error: supabaseError,
  } = useSupabaseData("Enemy");

  const engine = useGameEngine(supabaseData, supabaseLoading);
  const [activeTab, setActiveTab] = useState<"battle" | "map" | "inventory">(
    "battle",
  );

  useEffect(() => {
    if (supabaseLoading) {
      console.log("Supabase: กำลังโหลดข้อมูล...");
    } else {
      console.log("Supabase: โหลดข้อมูลเสร็จแล้ว! สถานะ Error:", supabaseError);
      console.log("Supabase: ข้อมูลที่ได้มาฝั่ง UI:", supabaseData);
    }
  }, [supabaseData, supabaseLoading, supabaseError]);

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => engine.handleAction("ATTACK"));
  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onEnd(() => engine.handleAction("DODGE", "LEFT"));
  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .onEnd(() => engine.handleAction("DODGE", "RIGHT"));
  const composedGesture = Gesture.Exclusive(swipeLeft, swipeRight, tapGesture);

  const bgInterpolation = engine.isEnraged ? "#2a0000" : "#000000";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* ===== BATTLE TAB ===== */}
        {activeTab === "battle" && engine.gameState !== "LOADING" && (
          <GestureDetector gesture={composedGesture}>
            <View
              style={[styles.container, { backgroundColor: bgInterpolation }]}
            >
              {/* Top Navbar HUD */}
              <ProfileButton />

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
                <View style={styles.bossBox}>
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

                    {/* TODO: Remove later - Debug Cooldown Bar */}
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
                      { transform: [{ translateY: engine.bY }] },
                    ]}
                  >
                    <Image
                      source={
                        engine.currentBossImage && BOSS_IMAGES[engine.currentBossImage]
                          ? BOSS_IMAGES[engine.currentBossImage]
                          : engine.currentBossImage
                            ? { uri: engine.currentBossImage }
                            : GundyrImg
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
                      source={HeroImg}
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
                <View style={styles.statRow}>
                  <Text style={styles.label}>HP</Text>
                  <View style={[styles.barBGHud, { flex: 1 }]}>
                    <Animated.View
                      style={[
                        styles.catchUpBar,
                        {
                          width: engine.pCatchUp.interpolate({
                            inputRange: [0, 100],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    />
                    <View
                      style={[styles.hpFill, { width: `${engine.pHp}%` }]}
                    />
                  </View>
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
            </View>
          </GestureDetector>
        )}

        {/* LOADING SCREEN OVERLAY */}
        {engine.gameState === "LOADING" && (
          <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color="#ff4444" />
            <Text style={styles.loadingScreenText}>LOADING CLOUD DATA...</Text>
          </View>
        )}

        {/* ===== MAP TAB ===== */}
        {activeTab === "map" && <MapScreen />}

        {/* ===== INVENTORY TAB ===== */}
        {activeTab === "inventory" && <InventoryScreen />}

        {/* ===== BOTTOM NAVBAR ===== */}
        <BottomNavbar activeTab={activeTab} onTabPress={setActiveTab} />
      </View>

      <Modal
        visible={engine.gameState !== "PLAYING"}
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
            {engine.gameState === "WON" ? "VICTORY" : "YOU DIED"}
          </Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={engine.resetGame}
            >
              <Text style={styles.retryText}>RETRY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.retryText}>MAIN MENU</Text>
            </TouchableOpacity>
          </View>
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
  hud: { position: "absolute", bottom: 60, left: 25, right: 25, zIndex: 2 },
  statRow: { flexDirection: "row", alignItems: "center" },
  label: { color: "white", fontSize: 14, width: 35, fontWeight: "bold" },
  hpFill: { height: "100%", backgroundColor: "#ef5350", position: "absolute" },
  comboText: {
    color: "#ffea00",
    fontSize: 16,
    fontWeight: "bold",
    fontStyle: "italic",
    marginBottom: 5,
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
});
