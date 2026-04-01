import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { CONFIG, getWeaponAttackConfig } from "../constants/GameConfig";
import { WeaponData } from "./usePlayerState";

import { BossPattern, EnemyData } from "./useLocalData";

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
  const maxStamina = 100 + (playerStats?.endurance || 10) * 2;

  const player = useRef({
    status: "IDLE",
    hp: initialPlayerHp,
    maxHp: playerStats?.maxHp || 100,
    isInvincible: false,
    poise: maxPoise,
    maxPoise: maxPoise,
    stamina: maxStamina,
    maxStamina: maxStamina,
    isBlocking: false,
    isParrying: false,
    bleed: 0,
    poison: 0
  });

  const boss = useRef({
    status: "IDLE",
    hp: CONFIG.BOSS.maxHp,
    damage: CONFIG.BOSS.damage,
    hitGap: CONFIG.BOSS.hitGap,
    isStunned: false,
    isHyperArmorActive: false,
    poise: 100,
    maxPoise: 100,
    bleed: 0,
    poison: 0
  });

  const [pHp, setPHp] = useState(initialPlayerHp);
  const [bHp, setBHp] = useState(CONFIG.BOSS.maxHp);
  const [bMaxHp, setBMaxHp] = useState(CONFIG.BOSS.maxHp);
  const [pPoise, setPPoise] = useState(50);
  const [bPoise, setBPoise] = useState(100);
  const [bMaxPoise, setBMaxPoise] = useState(100);
  const [pStamina, setPStamina] = useState(maxStamina);
  const [tension, setTension] = useState(0);
  const [estus, setEstus] = useState(CONFIG.PLAYER.ESTUS.MAX_USES);
  const [pBleed, setPBleed] = useState(0);
  const [pPoison, setPPoison] = useState(0);
  const [bBleed, setBBleed] = useState(0);
  const [bPoison, setBPoison] = useState(0);
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
  const pScale = useRef(new Animated.Value(1)).current;
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
  const [isCharging, setIsCharging] = useState(false);

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

  // Recovery & Status Tick Loop
  useEffect(() => {
    let interval: any;
    if (gameState === "PLAYING") {
      interval = setInterval(() => {
        // Player Poise & Stamina Recovery
        if (player.current.status !== "BUSY" && player.current.status !== "STAGGERED") {
          // Poise
          if (player.current.poise < player.current.maxPoise) {
            player.current.poise = Math.min(player.current.maxPoise, player.current.poise + 2);
            setPPoise(player.current.poise);
          }
          // Stamina
          const regenRate = player.current.isBlocking ? CONFIG.PLAYER.STAMINA.REGEN_BLOCKING : CONFIG.PLAYER.STAMINA.REGEN;
          if (player.current.stamina < player.current.maxStamina) {
            player.current.stamina = Math.min(player.current.maxStamina, player.current.stamina + regenRate / 2);
            setPStamina(player.current.stamina);
          }
        }

        // Boss Poise Recovery
        if (boss.current.poise < boss.current.maxPoise && !boss.current.isStunned) {
          boss.current.poise = Math.min(boss.current.maxPoise, boss.current.poise + 3);
          setBPoise(boss.current.poise);
        }

        // Status Effects Ticks (Poison)
        if (player.current.poison >= 100) {
          player.current.hp -= 2;
          setPHp(Math.max(0, player.current.hp));
          showFeedback("POISONED", "DAMAGE", "PLAYER");
          if (player.current.hp <= 0) setGameState("LOST");
        }
        if (boss.current.poison >= 100) {
          boss.current.hp -= 5;
          setBHp(Math.max(0, boss.current.hp));
          showFeedback("POISONED", "DAMAGE", "BOSS");
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

      // Wind-up: Lean back and shrink
      Animated.parallel([
        Animated.timing(bY, { toValue: -30, duration: windUp, useNativeDriver: true }),
        Animated.timing(bossScale, { toValue: 0.95, duration: windUp, useNativeDriver: true }),
      ]).start();

      animateImageArray(windUpImgs, windUp);
      await new Promise(r => setTimeout(r, windUp));

      if (boss.current.isStunned) break;

      // BOSS HYPER ARMOR ON: Swing started!
      boss.current.isHyperArmorActive = true;

      animateImageArray(activeImgs, isEnraged ? 80 : 120);

      // Impact: Lunge Forward and Grow
      Animated.parallel([
        Animated.timing(bY, { toValue: dropDist, duration: isEnraged ? 80 : 120, useNativeDriver: true }),
        Animated.timing(bossScale, { toValue: 1.15, duration: isEnraged ? 80 : 120, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(bY, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(bossScale, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]).start(() => {
          boss.current.isHyperArmorActive = false;
        });
      }, isEnraged ? 80 : 120);

      setTimeout(() => {
        if (gameState === "PLAYING" && !boss.current.isStunned) {
          if (heavy) {
            triggerShake(15);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          if (!player.current.isInvincible) {
            // Check for Block/Parry
            if (player.current.isParrying) {
              showFeedback("PARRIED!", "PERFECT", "PLAYER");
              showFeedback("RIPOST READY!", "PERFECT", "BOSS");
              triggerFlash(300);
              activateWitchTime(); // For boss stagger
              return;
            }

            let finalDmg = boss.current.damage + (isEnraged ? 10 : 0);
            let poiseDmg = heavy ? 40 : 20;

            if (player.current.isBlocking) {
              const blocked = Math.floor(finalDmg * 0.7);
              finalDmg -= blocked;
              poiseDmg = Math.floor(poiseDmg * 0.3);
              showFeedback(`BLOCKED -${finalDmg}`, "DAMAGE", "PLAYER");

              // Stamina cost for blocking a hit
              player.current.stamina = Math.max(0, player.current.stamina - CONFIG.PLAYER.STAMINA.BLOCK);
              setPStamina(player.current.stamina);
            } else {
              showFeedback(`-${finalDmg}`, "DAMAGE", "PLAYER");
            }

            // Apply Damage
            player.current.hp -= finalDmg;
            setPHp(Math.max(0, player.current.hp));

            // Apply Status Build-up (e.g. Poison from certain bosses)
            player.current.poison = Math.min(100, player.current.poison + 10);
            setPPoison(player.current.poison);

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
            setFleeProgress(0);

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

            showFeedback("DODGED!", "PERFECT", "PLAYER");
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
    boss.current.isHyperArmorActive = false;
    setBossAction("STAGGERED!");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    // Sharp Snap Recoil Backwards + Scale Down (to simulate depth)
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bY, { toValue: -50, duration: 80, useNativeDriver: true }),
        Animated.delay(2000), // Hold while stunned
        Animated.timing(bY, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(bossScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(bossScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ])
    ]).start();

    setCurrentBossImage(baseBossImage);

    Animated.timing(slowMoOverlay, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    setTimeout(() => {
      Animated.timing(slowMoOverlay, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }, 2000);

    setTimeout(() => {
      boss.current.isStunned = false;
      boss.current.status = "IDLE";
      boss.current.poise = boss.current.maxPoise;
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

    // Sharp Knockback for player + Scale Down
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pY, { toValue: 50, duration: 80, useNativeDriver: true }),
        Animated.delay(1000), // Hold during impact
        Animated.timing(pY, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(pScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(pScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ])
    ]).start();

    pX.stopAnimation();
    pX.setValue(0);
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

  const handleAction = async (type: "ATTACK" | "DODGE" | "BLOCK" | "HEAL" | "SKILL", direction?: "LEFT" | "RIGHT") => {
    if (isLocked || gameState !== "PLAYING") return;

    if (type === "HEAL") {
      if (estus <= 0) {
        showFeedback("NO ESTUS!", "DAMAGE", "PLAYER");
        return;
      }
      setIsLocked(true);
      setEstus(prev => prev - 1);
      showFeedback("HEALING...", "SUCCESS", "PLAYER");

      await new Promise(r => setTimeout(r, CONFIG.PLAYER.ESTUS.WINDUP));
      if (gameState === "PLAYING") {
        const healAmt = Math.floor(player.current.maxHp * CONFIG.PLAYER.ESTUS.HEAL_PERCENT);
        player.current.hp = Math.min(player.current.maxHp, player.current.hp + healAmt);
        setPHp(player.current.hp);
        showFeedback(`+${healAmt} HP`, "SUCCESS", "PLAYER");
      }
      setIsLocked(false);
      return;
    }

    if (type === "SKILL") {
      if (tension < 100) return;
      setTension(0);
      showFeedback("WEAPON ART!", "PERFECT", "PLAYER");
      executeAttack(true);
      return;
    }

    const staminaCost = type === "ATTACK" ? CONFIG.PLAYER.STAMINA.ATTACK :
      type === "DODGE" ? CONFIG.PLAYER.STAMINA.DODGE : 0;

    if (player.current.stamina < staminaCost) {
      showFeedback("EXHAUSTED", "DAMAGE", "PLAYER");
      return;
    }

    if (type === "ATTACK") {
        executeAttack(false);
        return;
    }

    // DODGE Logic (Restored to its original smooth state)
    if (type === "DODGE") {
        const c = CONFIG.PLAYER.DODGE;
        const dodgeDist = direction === "LEFT" ? -120 : 120;

        setIsLocked(true);
        player.current.status = "BUSY";

        // Step 1: Wind-up/Lean back
        animateSprite(c.row, c.frames, c.windUp + c.active);

        Animated.parallel([
          Animated.timing(pX, {
            toValue: dodgeDist * 0.4,
            duration: c.windUp,
            useNativeDriver: true,
          }),
          Animated.timing(pScale, {
            toValue: 0.95,
            duration: c.windUp,
            useNativeDriver: true,
          })
        ]).start(() => {
          player.current.isInvincible = true;

          // Step 2: Full Dodge
          Animated.parallel([
            Animated.timing(pX, {
              toValue: dodgeDist,
              duration: c.active,
              useNativeDriver: true,
            }),
            Animated.timing(pScale, {
              toValue: 1.1,
              duration: c.active,
              useNativeDriver: true,
            }),
          ]).start(() => {
            player.current.isInvincible = false;
            // Step 3: Recovery
            Animated.parallel([
              Animated.timing(pX, {
                toValue: 0,
                duration: c.recovery,
                useNativeDriver: true,
              }),
              Animated.timing(pScale, {
                toValue: 1,
                duration: c.recovery,
                useNativeDriver: true,
              })
            ]).start(() => {
              player.current.status = "IDLE";
              setIsLocked(false);
            });
          });
        });
        return;
    }

    if (type === "BLOCK") {
      const b = CONFIG.PLAYER.BLOCK;
      setIsLocked(true);
      player.current.isBlocking = true;
      player.current.isParrying = true;

      // Animate the block/parry
      animateSprite(b.row, b.frames, b.windUp + b.active + b.recovery);

      // Parry window lasts for the windup phase
      setTimeout(() => {
        player.current.isParrying = false;
      }, b.windUp);

      // Total block duration
      setTimeout(() => {
        player.current.isBlocking = false;
        player.current.status = "IDLE";
        setIsLocked(false);
        setFrameY(0);
      }, b.windUp + b.active + b.recovery);
      
      return;
    }

    player.current.stamina -= staminaCost;
    setPStamina(player.current.stamina);
  };

  const executeAttack = async (isSkill: boolean) => {
    if (gameState !== "PLAYING" || player.current.status !== "IDLE" || isLocked) return;
    
    const weaponConfig = getWeaponAttackConfig(equippedWeapon);
    if (!weaponConfig) return;

    setIsLocked(true);
    player.current.status = "ATTACK";

    // 1. Static Charge (Hold frame 3 of Row 1 for weapon's windUp time)
    setFrameY(1);
    setFrameX(3);

    // Hard wait for the wind-up to finish (Creating the "telegraph" feel)
    await new Promise(r => setTimeout(r, weaponConfig.windUp));

    // 2. The Lunge (Move to enemy while STILL holding frame 3)
    const lungeDist = isSkill ? -130 : -100;
    const powerMult = isSkill ? 3.0 : 1.0;
    const lungeSpeed = 50; // ⚡ Fast "Snap" movement
    
    Animated.parallel([
      Animated.timing(pY, { toValue: lungeDist, duration: lungeSpeed, useNativeDriver: true }),
      Animated.timing(pScale, { toValue: isSkill ? 1.35 : 1.15, duration: lungeSpeed, useNativeDriver: true }),
    ]).start(() => {
      // 3. THE IMPACT (Switch to Strike frame 4 ONLY after arrival)
      setFrameX(4); 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      setTimeout(() => {
        // 4. Smooth Recovery
        Animated.parallel([
          Animated.timing(pY, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(pScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          processAttackCompletion(isSkill, powerMult);
          player.current.status = "IDLE";
          setIsLocked(false);
          setFrameY(0);
          setFrameX(0); // Return to idle stance
        });
      }, 80); // Impact hold (Wait a bit on frame 4)
    });
  };

  const processAttackCompletion = (isSkill: boolean, powerMultiplier: number = 1.0) => {
    const weaponConfig = getWeaponAttackConfig(equippedWeapon);
    const strScaling = (playerStats?.strength || 10) / 10;
    let baseDmg = ((weaponConfig as any).damage || CONFIG.PLAYER.ATTACK.damage) * strScaling;
    if (isSkill) baseDmg *= 2.5;
    baseDmg *= powerMultiplier; // Apply Charge Attack Multiplier

    const critRate = (weaponConfig as any).critRate || 0;
    const critMult = (weaponConfig as any).critMultiplier || 1.5;
    const isCrit = Math.random() < critRate;
    const rawDmg = Math.floor(baseDmg + (combo * 2));
    const dmg = isCrit ? Math.floor(rawDmg * critMult) : rawDmg;

    boss.current.hp -= dmg;
    setBHp(Math.max(0, boss.current.hp));

    boss.current.bleed = Math.min(CONFIG.BOSS.STATUS.BLEED_LIMIT, boss.current.bleed + (weaponConfig as any).bleed);
    setBBleed(boss.current.bleed);
    if (boss.current.bleed >= CONFIG.BOSS.STATUS.BLEED_LIMIT) {
      const bleedDmg = Math.floor(bMaxHp * 0.15);
      boss.current.hp -= bleedDmg;
      setBHp(Math.max(0, boss.current.hp));
      showFeedback(`BLEED! -${bleedDmg}`, "PERFECT", "BOSS");
      boss.current.bleed = 0;
      setBBleed(0);
    }

    setTension(prev => Math.min(100, prev + (isCrit ? 15 : 10)));

    const wPoiseDmg = ((equippedWeapon as any)?.poiseDamage || 10) * (isSkill ? 3 : 1);

    if (!boss.current.isHyperArmorActive || isSkill) {
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

    if (boss.current.hp <= 0) {
      handleVictory();
    }
  };

  const handleVictory = () => {
    triggerFlash(1000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGameState("WON");
    Animated.parallel([
      Animated.timing(bossOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
      Animated.timing(bossScale, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
      Animated.timing(bY, { toValue: 50, duration: 2000, useNativeDriver: true }),
    ]).start();
  };

  const resetGame = () => {
    const startingHp = (initialEnemyData && initialEnemyData.length > 0 && initialEnemyData[0].hp) ? initialEnemyData[0].hp : CONFIG.BOSS.maxHp;
    const baseDamage = (initialEnemyData && initialEnemyData.length > 0 && initialEnemyData[0].damage) ? initialEnemyData[0].damage : CONFIG.BOSS.damage;
    const baseHitGap = (initialEnemyData && initialEnemyData.length > 0 && initialEnemyData[0].hit_gap) ? initialEnemyData[0].hit_gap : CONFIG.BOSS.hitGap;

    player.current = {
      ...player.current,
      status: "IDLE",
      hp: initialPlayerHp > 0 ? initialPlayerHp : (playerStats?.maxHp || 100),
      isInvincible: false,
      poise: player.current.maxPoise,
      stamina: maxStamina,
      poison: 0,
      bleed: 0
    };
    boss.current = {
      ...boss.current,
      status: "IDLE",
      hp: startingHp,
      damage: baseDamage,
      hitGap: baseHitGap,
      isStunned: false,
      poise: boss.current.maxPoise,
      poison: 0,
      bleed: 0
    };

    setPHp(player.current.hp);
    setBHp(startingHp);
    setBMaxHp(startingHp);
    setBPoise(boss.current.maxPoise);
    setBMaxPoise(boss.current.maxPoise);
    setPPoise(player.current.maxPoise);
    setPStamina(maxStamina);
    setTension(0);
    setEstus(CONFIG.PLAYER.ESTUS.MAX_USES);
    setPPoison(0);
    setPBleed(0);
    setBPoison(0);
    setBBleed(0);
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
    pScale.setValue(1);
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
    pStamina, pBleed, pPoison, bBleed, bPoison, tension, estus,
    gameState, setGameState, isLocked, bossAction, bossName, isEnraged, combo, feedbacks,
    pY, pX, bY, shakeX, flashOp, slowMoOverlay, pCatchUp, bCatchUp, bCooldown, bossOpacity, bossScale, pScale, frameX, frameY, currentBossImage,
    countdown, resetGame, handleAction, healPlayer, triggerEncounter,
    executeAttack,
    fleeProgress, isFleeing, setIsFleeing, fleeDifficulty
  };
}
