import { useState, useRef, useEffect } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { CONFIG } from "../constants/GameConfig";

export function useGameEngine() {
  const player = useRef({ status: "IDLE", hp: 100, isInvincible: false });
  const boss = useRef({ status: "IDLE", hp: CONFIG.BOSS.maxHp, isStunned: false });

  const [pHp, setPHp] = useState(100);
  const [bHp, setBHp] = useState(CONFIG.BOSS.maxHp);
  const [gameState, setGameState] = useState<"PLAYING" | "WON" | "LOST">("PLAYING");
  const [isLocked, setIsLocked] = useState(false);
  const [bossAction, setBossAction] = useState("WATCHING...");
  const [isEnraged, setIsEnraged] = useState(false);
  const [combo, setCombo] = useState(0);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Animations
  const pY = useRef(new Animated.Value(0)).current;
  const pX = useRef(new Animated.Value(0)).current;
  const bY = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const slowMoOverlay = useRef(new Animated.Value(0)).current;
  const pCatchUp = useRef(new Animated.Value(100)).current;
  const bCatchUp = useRef(new Animated.Value(100)).current;

  const [frameX, setFrameX] = useState(0);
  const [frameY, setFrameY] = useState(0);

  const triggerShake = (intensity = 10) => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: intensity, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -intensity, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: intensity/2, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -intensity/3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const triggerFlash = (duration = 200) => {
    flashOp.setValue(0.8);
    Animated.timing(flashOp, { toValue: 0, duration, useNativeDriver: true }).start();
  };

  const showFeedback = (text: string, type: string, target: "PLAYER" | "BOSS") => {
    const id = Date.now().toString() + Math.random().toString();
    setFeedbacks((prev) => [...prev, { id, text, type, target }]);
    setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, 1000);
  };

  useEffect(() => {
    Animated.timing(bCatchUp, {
      toValue: (bHp / CONFIG.BOSS.maxHp) * 100,
      duration: 600,
      delay: 300,
      useNativeDriver: false,
    }).start();

    if (bHp <= CONFIG.BOSS.maxHp / 2 && bHp > 0 && !isEnraged) {
      setIsEnraged(true);
      showFeedback("PHASE 2 ENABLED", "PARRY", "BOSS");
      triggerShake(20);
      triggerFlash(400);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [bHp]);

  useEffect(() => {
    Animated.timing(pCatchUp, {
      toValue: pHp,
      duration: 500,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [pHp]);

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

  useEffect(() => {
    let bossLoop: any;
    if (gameState === "PLAYING") {
      bossLoop = setInterval(() => {
        if (boss.current.status === "IDLE" && !boss.current.isStunned) {
          const rng = Math.random();
          const speedMod = isEnraged ? 0.6 : 1; 
          
          if (rng < 0.2) executePattern("HEAVY_SLAM", 1, 1200 * speedMod, 250, true);
          else if (rng < 0.4) executePattern("DOUBLE_SLASH", 2, 700 * speedMod, 180, false);
          else if (rng < 0.55) executePattern("FURY_COMBO", 3, 500 * speedMod, 150, false);
          else if (rng < 0.7) executePattern("JUMP_ATTACK", 1, 1500 * speedMod, 350, true);
          else if (rng < 0.85) executePattern("QUICK_STRIKE", 1, 300 * speedMod, 100, false);
          else executePattern("SPIN_SWEEP", 2, 800 * speedMod, 140, false);
        }
      }, isEnraged ? CONFIG.BOSS.idleTime * 0.6 : CONFIG.BOSS.idleTime);
    }
    return () => clearInterval(bossLoop);
  }, [gameState, isEnraged]);

  const executePattern = async (name: string, hits: number, windUp: number, dropDist: number, heavy: boolean) => {
    if (gameState !== "PLAYING" || boss.current.isStunned) return;
    boss.current.status = "BUSY";
    setBossAction(name);

    for (let i = 0; i < hits; i++) {
      if (gameState !== "PLAYING" || boss.current.isStunned) break;

      await new Promise((resolve) => {
        Animated.sequence([
          Animated.timing(bY, { toValue: -50, duration: windUp, useNativeDriver: true }),
          Animated.timing(bY, { toValue: -45, duration: 100, useNativeDriver: true }),
        ]).start(resolve);
      });
      
      if (boss.current.isStunned) break;

      Animated.sequence([
        Animated.timing(bY, { toValue: dropDist, duration: isEnraged ? 80 : 120, useNativeDriver: true }),
        Animated.timing(bY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        if (gameState === "PLAYING" && !boss.current.isStunned) {
          if (heavy) {
            triggerShake(15);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          if (!player.current.isInvincible) {
            player.current.hp -= CONFIG.BOSS.damage + (isEnraged ? 10 : 0);
            setPHp(Math.max(0, player.current.hp));
            showFeedback(`-${CONFIG.BOSS.damage + (isEnraged ? 10 : 0)}`, "DAMAGE", "PLAYER");
            triggerShake(10);
            triggerFlash(200);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setCombo(0);

            if (player.current.hp <= 0) {
              setGameState("LOST");
              setFrameY(5);
              setFrameX(7);
            }
          } else {
            triggerShake(5);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showFeedback("WITCH TIME!", "PERFECT", "PLAYER");
            activateWitchTime();
          }
        }
      }, isEnraged ? 50 : 80);

      await new Promise((resolve) => setTimeout(resolve, CONFIG.BOSS.hitGap * (isEnraged ? 0.7 : 1)));
    }

    if (!boss.current.isStunned) {
      boss.current.status = "IDLE";
      setBossAction("WATCHING...");
    }
  };

  const activateWitchTime = () => {
    if (boss.current.isStunned) return;
    boss.current.isStunned = true;
    setBossAction("STUNNED!");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    
    Animated.timing(slowMoOverlay, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    setTimeout(() => {
      Animated.timing(slowMoOverlay, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }, 2000);

    setTimeout(() => {
      boss.current.isStunned = false;
      boss.current.status = "IDLE";
      setBossAction("RECOVERING...");
    }, 2500);
  };

  const animateSprite = async (row: number, frames: number[], duration: number) => {
    setFrameY(row);
    const timePerFrame = duration / frames.length;
    for (let f of frames) {
      setFrameX(f);
      await new Promise((r) => setTimeout(r, timePerFrame));
    }
  };

  const handleAction = async (type: "ATTACK" | "DODGE", direction?: "LEFT" | "RIGHT") => {
    const c = type === "ATTACK" ? CONFIG.PLAYER.ATTACK : CONFIG.PLAYER.DODGE;
    if (isLocked || gameState !== "PLAYING") return;

    setIsLocked(true);
    player.current.status = type;
    let dodgeDist = 0;
    if (type === "DODGE") dodgeDist = direction === "LEFT" ? -120 : 120;

    animateSprite(c.row, c.frames, c.windUp + c.active);

    Animated.timing(type === "ATTACK" ? pY : pX, {
      toValue: type === "ATTACK" ? -50 : dodgeDist * 0.4,
      duration: c.windUp,
      useNativeDriver: true,
    }).start(() => {
      if (type === "DODGE") player.current.isInvincible = true;

      Animated.timing(type === "ATTACK" ? pY : pX, {
        toValue: type === "ATTACK" ? -140 : dodgeDist,
        duration: c.active,
        useNativeDriver: true,
      }).start(() => {
        if (type === "ATTACK") {
          const dmg = CONFIG.PLAYER.ATTACK.damage + (combo * 2);
          boss.current.hp -= dmg;
          setBHp(Math.max(0, boss.current.hp));
          setCombo(c => c + 1);
          
          showFeedback(`-${dmg}`, "DAMAGE", "BOSS");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          if (combo > 2) {
            triggerShake(5);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          if (boss.current.hp <= 0) {
            triggerFlash(1000);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setGameState("WON");
          }
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
    boss.current = { status: "IDLE", hp: CONFIG.BOSS.maxHp, isStunned: false };
    setPHp(100);
    setBHp(CONFIG.BOSS.maxHp);
    setFeedbacks([]);
    setGameState("PLAYING");
    setIsLocked(false);
    setIsEnraged(false);
    setCombo(0);
    pY.setValue(0);
    pX.setValue(0);
    bY.setValue(0);
    pCatchUp.setValue(100);
    bCatchUp.setValue(100);
  };

  return {
    pHp, setPHp, bHp, setBHp, gameState, setGameState, isLocked, bossAction, isEnraged, combo, feedbacks,
    pY, pX, bY, shakeX, flashOp, slowMoOverlay, pCatchUp, bCatchUp, frameX, frameY,
    resetGame, handleAction
  };
}
