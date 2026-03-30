import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
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

// --- Assets ---
const GundyrImg = require("@/assets/images/enemy/gundyr.png");
const HeroImg = require("@/assets/images/hero/ashen-one.png");

const { width } = Dimensions.get("window");

// --- Spritesheet Dimensions ---
const FRAME_WIDTH = 120;
const FRAME_HEIGHT = 120; // หัวไม่ขาดแน่นอน

const CONFIG = {
  PLAYER: {
    ATTACK: {
      windUp: 100,
      active: 150,
      recovery: 200,
      damage: 15,
      frames: [3, 4, 5],
      row: 1,
    },
    DODGE: {
      windUp: 50,
      active: 300,
      recovery: 200,
      frames: [0, 1, 2],
      row: 4,
    },
  },
  BOSS: {
    maxHp: 500, // เพิ่มเลือดบอส
    idleTime: 3000, // บอสยืนเฉยๆ นานขึ้น
    damage: 25,
    hitGap: 600, // ระยะห่างระหว่าง Combo นานขึ้น
  },
};

// --- Floating Text Component ---
const FloatingText = ({
  text,
  type,
}: {
  text: string;
  type: "DAMAGE" | "PERFECT";
}) => {
  const animY = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animY, {
        toValue: -60,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floatingText,
        type === "PERFECT" ? styles.textPerfect : styles.textDamage,
        { transform: [{ translateY: animY }], opacity: animOpacity },
      ]}
    >
      {text}
    </Animated.Text>
  );
};

export default function SoulsPatternGame() {
  const player = useRef({ status: "IDLE", hp: 100, isInvincible: false });
  const boss = useRef({ status: "IDLE", hp: CONFIG.BOSS.maxHp });

  const [pHp, setPHp] = useState(100);
  const [bHp, setBHp] = useState(CONFIG.BOSS.maxHp);
  const [gameState, setGameState] = useState<"PLAYING" | "WON" | "LOST">(
    "PLAYING",
  );
  const [isLocked, setIsLocked] = useState(false);
  const [bossAction, setBossAction] = useState("WATCHING...");

  // State สำหรับ Floating Texts
  const [feedbacks, setFeedbacks] = useState<
    {
      id: string;
      text: string;
      type: "DAMAGE" | "PERFECT";
      target: "PLAYER" | "BOSS";
    }[]
  >([]);

  const pY = useRef(new Animated.Value(0)).current;
  const pX = useRef(new Animated.Value(0)).current;
  const bY = useRef(new Animated.Value(0)).current;

  const [frameX, setFrameX] = useState(0);
  const [frameY, setFrameY] = useState(0);

  // ฟังก์ชันแสดง Text
  const showFeedback = (
    text: string,
    type: "DAMAGE" | "PERFECT",
    target: "PLAYER" | "BOSS",
  ) => {
    const id = Date.now().toString() + Math.random().toString();
    setFeedbacks((prev) => [...prev, { id, text, type, target }]);
    setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, 800);
  };

  // 1. Idle Loop
  useEffect(() => {
    let timer: any;
    if (player.current.status === "IDLE" && gameState === "PLAYING") {
      timer = setInterval(() => {
        setFrameY(0);
        setFrameX((prev) => (prev + 1) % 3);
      }, 250);
    }
    return () => clearInterval(timer);
  }, [gameState, isLocked]);

  // 2. Boss AI - Decide Pattern
  useEffect(() => {
    let bossLoop: any;
    if (gameState === "PLAYING") {
      bossLoop = setInterval(() => {
        if (boss.current.status === "IDLE") {
          const rng = Math.random();
          // เพิ่มแพทเทิร์นให้หลากหลายขึ้น
          if (rng < 0.2)
            executePattern("HEAVY_SLAM", 1, 1200, 250); // ตีหนัก ช้าๆ พุ่งน้อย
          else if (rng < 0.4)
            executePattern("DOUBLE_SLASH", 2, 700, 180); // ตี 2 ทีเร็วขึ้นนิดนึง
          else if (rng < 0.55)
            executePattern("FURY_COMBO", 3, 500, 150); // ชุดใหญ่แต่พุ่งสั้นๆ
          else if (rng < 0.7)
            executePattern("JUMP_ATTACK", 1, 1500, 350); // กระโดดสับ ช้ามากแต่พุ่งลงมาแรง
          else if (rng < 0.85)
            executePattern("QUICK_STRIKE", 1, 300, 100); // โจมตีเร็วแบบไม่ทันตั้งตัว
          else executePattern("SPIN_SWEEP", 2, 800, 140); // กวาด 2 รอบ ความเร็วปานกลาง
        }
      }, CONFIG.BOSS.idleTime);
    }
    return () => clearInterval(bossLoop);
  }, [gameState]);

  const executePattern = async (
    name: string,
    hits: number,
    windUp: number,
    dropDist: number,
  ) => {
    if (gameState !== "PLAYING") return;
    boss.current.status = "BUSY";
    setBossAction(name);

    for (let i = 0; i < hits; i++) {
      if (gameState !== "PLAYING") break;

      // ง้างอาวุธ (ช้าลงตามค่า windUp)
      await new Promise((resolve) => {
        Animated.sequence([
          Animated.timing(bY, {
            toValue: -50,
            duration: windUp,
            useNativeDriver: true,
          }),
          Animated.timing(bY, {
            toValue: -45,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start(resolve);
      });

      // ฟาดลงมา (ระยะพุ่งลงมาน้อยลง)
      Animated.sequence([
        Animated.timing(bY, {
          toValue: dropDist,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(bY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();

      // เช็ค Hit
      setTimeout(() => {
        if (gameState === "PLAYING") {
          if (!player.current.isInvincible) {
            // โดนดาเมจ
            player.current.hp -= CONFIG.BOSS.damage;
            setPHp(Math.max(0, player.current.hp));
            showFeedback(`-${CONFIG.BOSS.damage}`, "DAMAGE", "PLAYER");

            if (player.current.hp <= 0) {
              setGameState("LOST");
              setFrameY(5);
              setFrameX(7);
            }
          } else {
            // หลบได้พอดี
            showFeedback("PERFECT", "PERFECT", "PLAYER");
          }
        }
      }, 80); // ดีเลย์เช็คดาเมจเล็กน้อยให้ตรงกับท่าฟาด

      await new Promise((resolve) => setTimeout(resolve, CONFIG.BOSS.hitGap));
    }

    boss.current.status = "IDLE";
    setBossAction("WATCHING...");
  };

  // 3. Play Sprite Sequence
  const animateSprite = async (
    row: number,
    frames: number[],
    duration: number,
  ) => {
    setFrameY(row);
    const timePerFrame = duration / frames.length;
    for (let f of frames) {
      setFrameX(f);
      await new Promise((r) => setTimeout(r, timePerFrame));
    }
  };

  // 4. Combat Logic
  const handleAction = async (
    type: "ATTACK" | "DODGE",
    direction?: "LEFT" | "RIGHT",
  ) => {
    const c = type === "ATTACK" ? CONFIG.PLAYER.ATTACK : CONFIG.PLAYER.DODGE;
    if (isLocked || gameState !== "PLAYING") return;

    setIsLocked(true);
    player.current.status = type;
    let dodgeDist = 0;
    if (type === "DODGE") dodgeDist = direction === "LEFT" ? -120 : 120;

    animateSprite(c.row, c.frames, c.windUp + c.active);

    Animated.timing(type === "ATTACK" ? pY : pX, {
      toValue: type === "ATTACK" ? -40 : dodgeDist * 0.4,
      duration: c.windUp,
      useNativeDriver: true,
    }).start(() => {
      if (type === "DODGE") player.current.isInvincible = true;

      Animated.timing(type === "ATTACK" ? pY : pX, {
        toValue: type === "ATTACK" ? -100 : dodgeDist,
        duration: c.active,
        useNativeDriver: true,
      }).start(() => {
        if (type === "ATTACK") {
          boss.current.hp -= CONFIG.PLAYER.ATTACK.damage;
          setBHp(Math.max(0, boss.current.hp));
          showFeedback(`-${CONFIG.PLAYER.ATTACK.damage}`, "DAMAGE", "BOSS");

          if (boss.current.hp <= 0) setGameState("WON");
        }
        player.current.isInvincible = false;

        Animated.timing(type === "ATTACK" ? pY : pX, {
          toValue: 0,
          duration: c.recovery,
          useNativeDriver: true,
        }).start(() => {
          player.current.status = "IDLE";
          setIsLocked(false);
          setFrameY(0);
        });
      });
    });
  };

  const resetGame = () => {
    player.current = { status: "IDLE", hp: 100, isInvincible: false };
    boss.current = { status: "IDLE", hp: CONFIG.BOSS.maxHp };
    setPHp(100);
    setBHp(CONFIG.BOSS.maxHp);
    setFeedbacks([]);
    setGameState("PLAYING");
    setIsLocked(false);
    pY.setValue(0);
    pX.setValue(0);
    bY.setValue(0);
  };

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => handleAction("ATTACK"));
  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onEnd(() => handleAction("DODGE", "LEFT"));
  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .onEnd(() => handleAction("DODGE", "RIGHT"));
  const composedGesture = Gesture.Exclusive(swipeLeft, swipeRight, tapGesture);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.container}>
          <View style={styles.battleZone}>
            <View style={styles.bossBox}>
              <Text style={styles.bossTitle}>{bossAction}</Text>
              <View style={styles.barBG}>
                <View
                  style={[
                    styles.bossHP,
                    { width: `${(bHp / CONFIG.BOSS.maxHp) * 100}%` },
                  ]}
                />
              </View>

              <View style={styles.feedbackContainer}>
                {feedbacks
                  .filter((f) => f.target === "BOSS")
                  .map((f) => (
                    <FloatingText key={f.id} text={f.text} type={f.type} />
                  ))}
              </View>

              <Animated.View
                style={[styles.bossBody, { transform: [{ translateY: bY }] }]}
              >
                <Image
                  source={GundyrImg}
                  style={styles.fullImg}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            <View style={styles.playerContainer}>
              <View style={styles.feedbackContainer}>
                {feedbacks
                  .filter((f) => f.target === "PLAYER")
                  .map((f) => (
                    <FloatingText key={f.id} text={f.text} type={f.type} />
                  ))}
              </View>

              <Animated.View
                style={[
                  styles.spriteWindow,
                  { transform: [{ translateY: pY }, { translateX: pX }] },
                ]}
              >
                <Image
                  source={HeroImg}
                  style={[
                    styles.spritesheet,
                    { left: -frameX * FRAME_WIDTH, top: -frameY * (719 / 6) },
                  ]}
                />
              </Animated.View>
            </View>
          </View>

          <View style={styles.hud}>
            <View style={styles.statRow}>
              <Text style={styles.label}>HP</Text>
              <View style={styles.barBG}>
                <View style={[styles.hpFill, { width: `${pHp}%` }]} />
              </View>
            </View>
          </View>
        </View>
      </GestureDetector>

      <Modal visible={gameState !== "PLAYING"} transparent animationType="fade">
        <View style={styles.modal}>
          <Text style={styles.modalText}>
            {gameState === "WON" ? "VICTORY" : "YOU DIED"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={resetGame}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  battleZone: { flex: 1 },
  bossBox: { marginTop: 40, alignItems: "center", position: "relative" },
  bossTitle: {
    color: "red",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 2,
  },
  barBG: {
    flex: 1,
    height: 6,
    backgroundColor: "#222",
    borderRadius: 3,
    overflow: "hidden",
  },
  bossHP: { height: "100%", backgroundColor: "#ff8c00" },
  bossBody: { width: 300, height: 300 },
  fullImg: { width: "100%", height: "100%" },
  playerContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 150,
    position: "relative",
  },
  spriteWindow: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: "hidden",
  },
  spritesheet: { width: 1080, height: 719, position: "absolute" },
  hud: { position: "absolute", bottom: 60, left: 25, right: 25 },
  statRow: { flexDirection: "row", alignItems: "center" },
  label: { color: "white", fontSize: 10, width: 35, fontWeight: "bold" },
  hpFill: { height: "100%", backgroundColor: "#ff4d4d" },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalText: {
    color: "#ff1100",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  retryBtn: { padding: 15, borderWidth: 1, borderColor: "white" },
  retryText: { color: "white", fontWeight: "bold" },

  // Styles สำหรับ Floating Text
  feedbackContainer: {
    position: "absolute",
    top: 50, // จุดกึ่งกลางที่จะให้ Text เด้งขึ้นมา
    zIndex: 10,
    alignItems: "center",
  },
  floatingText: {
    position: "absolute",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  textDamage: {
    color: "#ff3333", // สีแดงเวลาโดนดาเมจ
  },
  textPerfect: {
    color: "#ffd700", // สีทองเวลาหลบเพอร์เฟกต์
    fontStyle: "italic",
    letterSpacing: 1,
  },
});
