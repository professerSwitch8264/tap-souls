import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { CONFIG, getWeaponAttackConfig } from "../constants/GameConfig";
import { WeaponData } from "./usePlayerState";

import { BossPattern, EnemyData } from "./useSupabaseData";

const DEFAULT_BOSS_PATTERNS: BossPattern[] = [
  {
    hits: 1,
    name: "HEAVY_SLAM",
    heavy: true,
    weight: 0.2,
    windUp: 1200,
    cooldown: 2500,
    dropDist: 250,
    activeImgs: ["gundyr.png"],
    windUpImgs: ["gundyr.png"]
  }
];

export function useGameEngine(initialEnemyData?: EnemyData[] | null, isDataLoading?: boolean, initialPlayerHp: number = 100, equippedWeapon?: WeaponData | null, playerStats?: any) {
  const maxPoise = (playerStats?.basePoise || 50) + (playerStats?.endurance || 0);
  const player = useRef({ status: "IDLE", hp: initialPlayerHp, isInvincible: false, poise: maxPoise, maxPoise: maxPoise });
  const boss = useRef({ status: "IDLE", hp: CONFIG.BOSS.maxHp, damage: CONFIG.BOSS.damage, hitGap: CONFIG.BOSS.hitGap, isStunned: false, isHyperArmorActive: false, poise: 100, maxPoise: 100 });

  const [pHp, setPHp] = useState(initialPlayerHp);
  const [bHp, setBHp] = useState(CONFIG.BOSS.maxHp);
  const [bMaxHp, setBMaxHp] = useState(CONFIG.BOSS.maxHp);
  const [pPoise, setPPoise] = useState(50);
  const [bPoise, setBPoise] = useState(100);
  const [bMaxPoise, setBMaxPoise] = useState(100);
  const [bossName, setBossName] = useState("GUNDYR");
  const [gameState, setGameState] = useState<"LOADING" | "EXPLORING" | "COUNTDOWN" | "PLAYING" | "WON" | "LOST">("LOADING");
  const [countdown, setCountdown] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [bossAction, setBossAction] = useState("WATCHING...");
  const [isEnraged, setIsEnraged] = useState(false);
  const [combo, setCombo] = useState(0);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [bossPatterns, setBossPatterns] = useState<BossPattern[]>(DEFAULT_BOSS_PATTERNS);
  const [currentBossImage, setCurrentBossImage] = useState<string | null>(null);
  const [baseBossImage, setBaseBossImage] = useState<string | null>(null);
  const [fleeDifficulty, setFleeDifficulty] = useState(0);

  // Flee logic state
  const [fleeProgress, setFleeProgress] = useState(0);
  const [isFleeing, setIsFleeing] = useState(false);

  // Animations
  const pY = useRef(new Animated.Value(0)).current;
  const pX = useRef(new Animated.Value(0)).current;
  const bY = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const slowMoOverlay = useRef(new Animated.Value(0)).current;
  const pCatchUp = useRef(new Animated.Value(initialPlayerHp)).current;

  // Sync HP with map state when not in combat
  useEffect(() => {
    if (gameState !== "PLAYING" && gameState !== "COUNTDOWN" && gameState !== "LOST") {
      player.current.hp = initialPlayerHp;
      setPHp(initialPlayerHp);
      pCatchUp.setValue(initialPlayerHp);
      
      // Reset Poise
      player.current.poise = player.current.maxPoise;
      setPPoise(player.current.maxPoise);
    }
  }, [initialPlayerHp]);
  const bCatchUp = useRef(new Animated.Value(100)).current;
  const bCooldown = useRef(new Animated.Value(0)).current;
  const bossOpacity = useRef(new Animated.Value(1)).current;
  const bossScale = useRef(new Animated.Value(1)).current;

  const [frameX, setFrameX] = useState(0);
  const [frameY, setFrameY] = useState(0);

  const triggerShake = (intensity = 10) => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: intensity, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -intensity, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: intensity / 2, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -intensity / 3, duration: 40, useNativeDriver: true }),
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
    // Wait until data finishes loading
    if (isDataLoading) return;

    if (initialEnemyData && initialEnemyData.length > 0) {
      // Setup from the first enemy in the table
      const enemy = initialEnemyData[0];
      console.log("🔥 Boss Data Loaded into Engine:", enemy);
      const startingHp = enemy.hp || CONFIG.BOSS.maxHp;

      boss.current.hp = startingHp;
      boss.current.damage = enemy.damage || CONFIG.BOSS.damage;
      boss.current.hitGap = enemy.hit_gap || CONFIG.BOSS.hitGap;
      const startingPoise = (enemy as any).poise || 100;
      boss.current.poise = startingPoise;
      boss.current.maxPoise = startingPoise;
      setBHp(startingHp);
      setBMaxHp(startingHp);
      setBPoise(startingPoise);
      setBMaxPoise(startingPoise);
      setBossName(enemy.name || "UNKNOWN BOSS");

      if (enemy.image_url) {
        setBaseBossImage(enemy.image_url);
        setCurrentBossImage(enemy.image_url);
      } else {
        setBaseBossImage(null);
        setCurrentBossImage(null);
      }

      setFleeDifficulty((enemy as any).flee_difficulty || 5);

      if (enemy.pattern && enemy.pattern.length > 0) {
        console.log("✅ ดึง Pattern ข้อมูลจาก Supabase แล้ว! จำนวน:", enemy.pattern.length, "ท่า");
        enemy.pattern.forEach((p: BossPattern) => {
          console.log(`- ท่า: ${p.name} | Cooldown: ${p.cooldown}ms | ActiveImgs: ${p.activeImgs?.join(',')} | WindUpImgs: ${p.windUpImgs?.join(',')}`);
        });
        setBossPatterns(enemy.pattern);
      }
    } else {
      // Fallback
      console.log("⚠️ ไม่มีข้อมูลบอส หรือโหลดมาได้อาเรย์ว่างเปล่า [] (ใช้ค่า Default แทน)");
      boss.current.hp = CONFIG.BOSS.maxHp;
      setBHp(CONFIG.BOSS.maxHp);
      setBMaxHp(CONFIG.BOSS.maxHp);
      setBossName("GUNDYR (OFFLINE)");
      setBaseBossImage(null);
      setCurrentBossImage(null);
    }
    setGameState("EXPLORING");
    setCountdown(0);
  }, [initialEnemyData, isDataLoading]);

  // Countdown Logic
  useEffect(() => {
    let timer: any;
    if (gameState === "COUNTDOWN" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (gameState === "COUNTDOWN" && countdown === 0) {
      // Show "GO!" for 500ms before starting
      timer = setTimeout(() => {
        setGameState("PLAYING");
      }, 500);
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown]);

  // Poise Recovery loop
  useEffect(() => {
    let interval: any;
    if (gameState === "PLAYING") {
      interval = setInterval(() => {
        // Player Poise Recovery
        if (player.current.poise < player.current.maxPoise && player.current.status !== "BUSY") {
          player.current.poise = Math.min(player.current.maxPoise, player.current.poise + 2);
          setPPoise(player.current.poise);
        }
        // Boss Poise Recovery
        if (boss.current.poise < boss.current.maxPoise && !boss.current.isStunned) {
          boss.current.poise = Math.min(boss.current.maxPoise, boss.current.poise + 3);
          setBPoise(boss.current.poise);
        }
      }, 500); 
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Flee progress logic
  useEffect(() => {
    let timer: any;
    if (isFleeing && gameState === "PLAYING" && fleeDifficulty > 0) {
      timer = setInterval(() => {
        setFleeProgress((prev) => {
          const inc = 10 / fleeDifficulty; // Harder = slower
          const next = prev + inc;
          return next >= 100 ? 100 : next;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isFleeing, gameState, fleeDifficulty]);

  useEffect(() => {
    Animated.timing(bCatchUp, {
      toValue: (bHp / bMaxHp) * 100,
      duration: 600,
      delay: 300,
      useNativeDriver: false,
    }).start();

    if (bHp <= bMaxHp / 2 && bHp > 0 && !isEnraged) {
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

          let acc = 0;
          for (const p of bossPatterns) {
            if (rng >= acc && rng < acc + p.weight) {
              executePattern(p.name, p.hits, p.windUp * speedMod, p.dropDist, p.heavy, p.cooldown, p.windUpImgs, p.activeImgs);
              break;
            }
            acc += p.weight;
          }
        }
      }, 250); // AI Tick Rate
    }
    return () => clearInterval(bossLoop);
  }, [gameState, isEnraged, bossPatterns]);

  const animateImageArray = async (urls: string[] | undefined, duration: number) => {
    if (!urls || urls.length === 0) return;
    const timePerFrame = duration / urls.length;
    for (let i = 0; i < urls.length; i++) {
      if (gameState !== "PLAYING" || boss.current.isStunned) break;
      setCurrentBossImage(urls[i]);
      await new Promise((r) => setTimeout(r, timePerFrame));
    }
  };

  const executePattern = async (name: string, hits: number, windUp: number, dropDist: number, heavy: boolean, cooldown: number, windUpImgs?: string[], activeImgs?: string[]) => {
    if (gameState !== "PLAYING" || boss.current.isStunned) return;
    boss.current.status = "BUSY";
    setBossAction(name);

    for (let i = 0; i < hits; i++) {
      if (gameState !== "PLAYING" || boss.current.isStunned) break;

      animateImageArray(windUpImgs, windUp);

      await new Promise((resolve) => {
        Animated.sequence([
          Animated.timing(bY, { toValue: -50, duration: windUp, useNativeDriver: true }),
          Animated.timing(bY, { toValue: -45, duration: 100, useNativeDriver: true }),
        ]).start(resolve);
      });

      if (boss.current.isStunned) break;

      // BOSS HYPER ARMOR ON: Swing started!
      boss.current.isHyperArmorActive = true;

      animateImageArray(activeImgs, isEnraged ? 80 : 120);

      Animated.sequence([
        Animated.timing(bY, { toValue: dropDist, duration: isEnraged ? 80 : 120, useNativeDriver: true }),
        Animated.timing(bY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start(() => {
        boss.current.isHyperArmorActive = false;
      });

      setTimeout(() => {
        if (gameState === "PLAYING" && !boss.current.isStunned) {
          if (heavy) {
            triggerShake(15);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          if (!player.current.isInvincible) {
            // Apply Damage
            player.current.hp -= boss.current.damage + (isEnraged ? 10 : 0);
            setPHp(Math.max(0, player.current.hp));
            showFeedback(`-${boss.current.damage + (isEnraged ? 10 : 0)}`, "DAMAGE", "PLAYER");
            
            // Apply Poise Damage
            let poiseDmg = heavy ? 40 : 20;
            // Hyper Armor check
            if (player.current.status === "ATTACK") {
              const weaponArmor = (equippedWeapon as any)?.hyperArmor || 1.0;
              poiseDmg = Math.floor(poiseDmg / weaponArmor);
              showFeedback("TRADED!", "PARRY", "PLAYER");
            }
            
            player.current.poise -= poiseDmg;
            setPPoise(Math.max(0, player.current.poise));

            triggerShake(10);
            triggerFlash(200);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setCombo(0);
            setFleeProgress(0); // Reset flee progress on hit!

            if (player.current.poise <= 0) {
              triggerPlayerStagger();
            }

            if (player.current.hp <= 0) {
              setGameState("LOST");
              setFrameY(5);
              setFrameX(7);
            }
          } else {
            triggerShake(5);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // 25% Chance for boss stun (Witch Time) on successful dodge
            if (Math.random() < 0.25) {
              showFeedback("WITCH TIME!", "PERFECT", "PLAYER");
              activateWitchTime();
            } else {
              showFeedback("DODGED!", "PERFECT", "PLAYER");
            }
          }
        }
      }, isEnraged ? 50 : 80);

      await new Promise((resolve) => setTimeout(resolve, boss.current.hitGap * (isEnraged ? 0.7 : 1)));
      setCurrentBossImage(baseBossImage);
    }

    if (!boss.current.isStunned && gameState === "PLAYING") {
      setCurrentBossImage(baseBossImage);
      setBossAction("RECOVERING...");
      
      const realCooldown = cooldown * (isEnraged ? 0.6 : 1);
      
      bCooldown.setValue(100);
      Animated.timing(bCooldown, {
        toValue: 0,
        duration: realCooldown,
        useNativeDriver: false,
      }).start();

      await new Promise((resolve) => setTimeout(resolve, realCooldown));

      if (!boss.current.isStunned && gameState === "PLAYING") {
        boss.current.status = "IDLE";
        setBossAction("WATCHING...");
      }
    }
  };

  const activateWitchTime = () => {
    if (boss.current.isStunned) return;
    boss.current.isStunned = true;
    boss.current.isHyperArmorActive = false; // Breaking stagger removes hyper armor
    setBossAction("STAGGERED!");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    // CANCEL ALL BOSS ANIMATIONS IMMEDIATELY
    bY.stopAnimation();
    setCurrentBossImage(baseBossImage);

    Animated.timing(slowMoOverlay, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    setTimeout(() => {
      Animated.timing(slowMoOverlay, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }, 2000);

    setTimeout(() => {
      boss.current.isStunned = false;
      boss.current.status = "IDLE";
      boss.current.poise = boss.current.maxPoise; // RESET POISE AFTER STUN
      setBPoise(boss.current.maxPoise);
      setBossAction("RECOVERING...");
    }, 2500);
  };

  const triggerPlayerStagger = () => {
    if (player.current.status === "BUSY" || player.current.status === "STAGGERED") return;
    showFeedback("STAGGERED!", "LOST", "PLAYER");
    player.current.status = "BUSY";
    setIsLocked(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    triggerShake(20);
    
    // CANCEL PLAYER ANIMATIONS IMMEDIATELY
    pY.stopAnimation();
    pX.stopAnimation();
    pY.setValue(0);
    pX.setValue(0);
    
    // Stagger animation/lock
    setFrameY(5);
    setFrameX(7); 
    
    setTimeout(() => {
      player.current.status = "IDLE";
      player.current.poise = player.current.maxPoise;
      setPPoise(player.current.maxPoise);
      setIsLocked(false);
      setFrameY(0);
    }, 1200);
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
    const weaponConfig = type === "ATTACK" ? getWeaponAttackConfig(equippedWeapon) : CONFIG.PLAYER.DODGE;
    const c = { ...weaponConfig };
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
          // Use weapon damage + combo bonus, with crit chance
          // Use weapon damage + combo bonus, with crit chance + STR scaling
          const strScaling = (playerStats?.strength || 10) / 10;
          const baseDmg = ((weaponConfig as any).damage || CONFIG.PLAYER.ATTACK.damage) * strScaling;
          const critRate = (weaponConfig as any).critRate || 0;
          const critMult = (weaponConfig as any).critMultiplier || 1.5;
          const isCrit = Math.random() < critRate;
          const rawDmg = Math.floor(baseDmg + (combo * 2));
          const dmg = isCrit ? Math.floor(rawDmg * critMult) : rawDmg;

          boss.current.hp -= dmg;
          setBHp(Math.max(0, boss.current.hp));
          
          // Apply Poise Damage to Boss (Unless HYPER ARMOR is active)
          const wPoiseDmg = (equippedWeapon as any)?.poiseDamage || 10;
          
          if (!boss.current.isHyperArmorActive) {
            boss.current.poise -= wPoiseDmg;
            setBPoise(Math.max(0, boss.current.poise));
            
            if (boss.current.poise <= 0) {
              showFeedback("STAGGERED!", "PERFECT", "BOSS");
              activateWitchTime();
            }
          } else {
            showFeedback("HYPER ARMOR!", "PARRY", "BOSS");
          }
          
          setCombo(prev => prev + 1);

          if (isCrit) {
            showFeedback(`-${dmg} CRIT!`, "PERFECT", "BOSS");
            triggerShake(8);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            showFeedback(`-${dmg}`, "DAMAGE", "BOSS");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }

          if (combo > 2) {
            triggerShake(5);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          if (boss.current.hp <= 0) {
            triggerFlash(1000);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setGameState("WON");
            
            // Dissolve animation
            Animated.parallel([
              Animated.timing(bossOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
              Animated.timing(bossScale, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
              Animated.timing(bY, { toValue: 50, duration: 2000, useNativeDriver: true }),
            ]).start();
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
    const startingHp = (initialEnemyData && initialEnemyData.length > 0 && initialEnemyData[0].hp) ? initialEnemyData[0].hp : CONFIG.BOSS.maxHp;
    const baseDamage = (initialEnemyData && initialEnemyData.length > 0 && initialEnemyData[0].damage) ? initialEnemyData[0].damage : CONFIG.BOSS.damage;
    const baseHitGap = (initialEnemyData && initialEnemyData.length > 0 && initialEnemyData[0].hit_gap) ? initialEnemyData[0].hit_gap : CONFIG.BOSS.hitGap;

    player.current = { 
      ...player.current, 
      status: "IDLE", 
      hp: pHp, 
      isInvincible: false, 
      poise: player.current.maxPoise 
    };
    boss.current = { 
      ...boss.current, 
      status: "IDLE", 
      hp: startingHp, 
      damage: baseDamage, 
      hitGap: baseHitGap, 
      isStunned: false, 
      poise: boss.current.maxPoise 
    };

    setBHp(startingHp);
    setBMaxHp(startingHp);
    setBPoise(boss.current.maxPoise);
    setBMaxPoise(boss.current.maxPoise);
    setPPoise(player.current.maxPoise);
    setFeedbacks([]);
    setGameState("EXPLORING");
    setCountdown(0);
    setIsLocked(false);
    setIsEnraged(false);
    setCombo(0);
    pY.setValue(0);
    pX.setValue(0);
    bY.setValue(0);
    pCatchUp.setValue(100);
    bCatchUp.setValue(100);
    bCooldown.setValue(0);
    bossOpacity.setValue(1);
    bossScale.setValue(1);
    setFleeProgress(0);
    setIsFleeing(false);
  };

  const healPlayer = () => {
    const maxHp = playerStats?.maxHp || 100;
    player.current.hp = maxHp;
    setPHp(maxHp);
    pCatchUp.setValue(maxHp);
    showFeedback(`+${maxHp} HP`, "SUCCESS", "PLAYER");
  };

  const triggerEncounter = () => {
    setGameState("COUNTDOWN");
    setCountdown(3);
  };

  return {
    pHp, setPHp, bHp, setBHp, bMaxHp,
    pPoise, setPPoise, bPoise, setBPoise, bMaxPoise,
    gameState, setGameState, isLocked, bossAction, bossName, isEnraged, combo, feedbacks,
    pY, pX, bY, shakeX, flashOp, slowMoOverlay, pCatchUp, bCatchUp, bCooldown, bossOpacity, bossScale, frameX, frameY, currentBossImage,
    countdown, resetGame, handleAction, healPlayer, triggerEncounter,
    fleeProgress, isFleeing, setIsFleeing, fleeDifficulty
  };
}
