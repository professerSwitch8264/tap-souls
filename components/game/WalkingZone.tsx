import React, { useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../constants/GameConfig";
import { HERO_IMAGES, RESOURCE_IMAGES, getEnemyImageByEnemyId, getGameImage } from "../../constants/ImageRegistry";
import { ProfileButton } from '../ui/ProfileButton';
import enemyData from "../../data/enemies.json";

// Icon config for each tile type
const TILE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  bonfire: { icon: 'fire', color: '#ff9800', label: 'BONFIRE' },
  path: { icon: 'road', color: '#555', label: 'PATH' },
  enemy: { icon: 'skull-crossbones', color: '#ff4444', label: 'ENEMY' },
  boss: { icon: 'crown', color: '#ff1744', label: 'BOSS' },
  chest: { icon: 'gem', color: '#ffd54f', label: 'CHEST' },
  event: { icon: 'hat-wizard', color: '#7e57c2', label: 'EVENT' },
};

export interface WalkingZoneProps {
  tiles: any[];
  currentTileIndex: number;
  moveToNextTile: () => void;
  moveToPreviousTile: () => void;
  defeatedTiles: number[];
  hp: number;
  onEncounter: (enemyId?: string) => void;
  onRest: () => void;
  onMapComplete: () => void;
  onReturnToMap: () => void;
  mapName: string;
}

export function WalkingZone({
  tiles,
  currentTileIndex,
  moveToNextTile,
  moveToPreviousTile,
  defeatedTiles = [],
  hp = 100,
  onEncounter,
  onRest,
  onMapComplete,
  onReturnToMap,
  mapName,
}: WalkingZoneProps) {
  const currentTile = tiles[currentTileIndex];
  const isLastTile = currentTileIndex >= tiles.length - 1;
  const isFirstTile = currentTileIndex === 0;
  const totalTiles = tiles.length;
  const isDefeated = defeatedTiles.includes(currentTileIndex);

  console.log('[WalkingZone] Rendering:', { currentTileIndex, hp, isDefeated, mapName });

  const [isMoving, setIsMoving] = useState(false);

  // Animations
  const walkAnim = useRef(new Animated.Value(0)).current;
  const envScale = useRef(new Animated.Value(1)).current;
  const envOpacity = useRef(new Animated.Value(0.5)).current;
  const objectScale = useRef(new Animated.Value(1)).current;

  // Sprite Frame
  const [frameX, setFrameX] = useState(0);

  // Encounter Interaction States
  const [encounterPhase, setEncounterPhase] = useState<'CHOICE' | 'TALK'>('CHOICE');
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);

  // If no tiles or invalid index, show map complete
  if (!currentTile) {
    return (
      <View style={styles.container}>
        <View style={styles.completeContainer}>
          <FontAwesome5 name="flag-checkered" size={60} color="#ffd54f" />
          <Text style={styles.completeTitle}>AREA CLEARED</Text>
          <Text style={styles.completeSubtitle}>{mapName}</Text>
          <Text style={styles.completeDesc}>You have conquered this area. Return to the world map to continue your journey.</Text>
          <TouchableOpacity style={styles.returnBtn} onPress={onMapComplete}>
            <FontAwesome5 name="map-marked-alt" size={16} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.returnText}>RETURN TO WORLD MAP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tileConfig = TILE_TYPE_CONFIG[currentTile.type] || TILE_TYPE_CONFIG.path;

  const handleStep = () => {
    if (isMoving) return;

    // If on bonfire, don't auto-move (player needs to press REST or TAP to continue)
    // If on enemy/boss, don't auto-move (need to fight first via encounter)
    setIsMoving(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Walking animation
    Animated.parallel([
      Animated.sequence([
        Animated.timing(walkAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
        Animated.timing(walkAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(envScale, { toValue: 1.2, duration: 300, useNativeDriver: true }),
        Animated.timing(envScale, { toValue: 1, duration: 0, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(envOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(envOpacity, { toValue: 0.5, duration: 150, useNativeDriver: true }),
      ]),
      // Object bounce
      Animated.sequence([
        Animated.timing(objectScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(objectScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setIsMoving(false);
      moveToNextTile();
    });

    setFrameX(f => (f + 1) % 3);
  };

  const handleBackwardStep = () => {
    if (isMoving || isFirstTile) return;
    setIsMoving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(walkAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
        Animated.timing(walkAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(envScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        Animated.timing(envScale, { toValue: 1, duration: 0, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setIsMoving(false);
      moveToPreviousTile();
    });

    setFrameX(f => (f + 1) % 3);
  };

  const handleTalk = () => {
    const enemy = enemyData.enemies.find(e => e.id === currentTile.enemyId);
    if (enemy && enemy.dialogues.length > 0) {
      const randomLine = enemy.dialogues[Math.floor(Math.random() * enemy.dialogues.length)];
      setActiveDialogue(randomLine);
      setEncounterPhase('TALK');
    } else {
      setActiveDialogue("...");
      setEncounterPhase('TALK');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFlee = () => {
    const enemy = enemyData.enemies.find(e => e.id === currentTile.enemyId);
    const fleeChance = enemy?.flee_chance ?? 0.3; // Default 30% if not specified

    if (fleeChance <= 0) {
      alert("You cannot flee from this encounter!");
      return;
    }

    const success = Math.random() < fleeChance;
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert("Escaped successfully!");
      handleStep();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Failed to flee! The enemy blocks your way!");
      // Forced encounter
      onEncounter(currentTile.enemyId || undefined);
    }
  };

  // Handle interactions based on tile type
  const handleTileAction = () => {
    if (currentTile.type === 'bonfire') {
      onRest();
    } else if ((currentTile.type === 'enemy' || currentTile.type === 'boss') && !isDefeated) {
      onEncounter(currentTile.enemyId || undefined);
    } else if (currentTile.type === 'chest') {
      // TODO: Implement chest opening
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert(`Found: ${currentTile.loot?.souls || 0} souls!`);
      handleStep(); // Auto-advance after collecting
    }
  };

  const hasAction = (currentTile.type === 'bonfire') || 
                    ((currentTile.type === 'enemy' || currentTile.type === 'boss') && !isDefeated) || 
                    currentTile.type === 'chest';

  return (
    <View style={styles.container}>
      {/* Top HUD - Profile + Map Info */}
      <View style={[styles.topHud, { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }]}>
        <View style={styles.topLeftSide}>
          <ProfileButton hp={hp} />
          <TouchableOpacity style={styles.backBtn} onPress={onReturnToMap}>
            <FontAwesome5 name="chevron-left" size={12} color="#888" />
            <Text style={styles.backText}>MAP</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.topRightSide}>
          <Text style={styles.mapTitle}>{mapName.toUpperCase()}</Text>
          <Text style={styles.progressText}>{currentTileIndex + 1} / {totalTiles}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentTileIndex + 1) / totalTiles) * 100}%` }]} />
        </View>
        {/* Tile dots */}
        <View style={styles.dotsRow}>
          {tiles.map((tile, i) => {
            const dotConfig = TILE_TYPE_CONFIG[tile.type] || TILE_TYPE_CONFIG.path;
            const isPast = i < currentTileIndex;
            const isCurrent = i === currentTileIndex;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: isPast ? '#333' : isCurrent ? dotConfig.color : '#1a1a1a' },
                  isCurrent && { borderColor: dotConfig.color, borderWidth: 2, width: 14, height: 14, borderRadius: 7 },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Main Scene */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.walkingArea}
        onPress={hasAction ? undefined : handleStep}
      >
        {/* Background */}
        <Animated.View style={[styles.envLayer, { transform: [{ scale: envScale }], opacity: envOpacity }]}>
          <View style={styles.forestPath} />
          <View style={styles.fogOverlay} />
        </Animated.View>

        {/* Tile Object - Show actual image */}
        {(() => {
          // Priority: enemy image > tile image > icon fallback
          const enemyImg = currentTile.enemyId ? getEnemyImageByEnemyId(currentTile.enemyId) : null;
          const tileImg = currentTile.image ? getGameImage(currentTile.image) : null;
          const displayImg = enemyImg || tileImg;

          if (displayImg) {
            return (
              <Animated.View style={[
                styles.tileObjectContainer, 
                { transform: [{ scale: objectScale }], opacity: isDefeated ? 0.3 : 1 } 
              ]}>
                {isDefeated && (
                  <View style={styles.defeatedOverlay}>
                    <FontAwesome5 name="skull" size={24} color="#555" />
                  </View>
                )}
                <Image
                  source={displayImg}
                  style={[
                    styles.tileObjectImage,
                    // Enemy/boss images are bigger
                    (currentTile.type === 'enemy' || currentTile.type === 'boss') && styles.enemyObjectImage,
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
            );
          }

          // Fallback: icon for tiles without images (path, event, etc.)
          return (
            <View style={styles.tileIconContainer}>
              <View style={[styles.tileIconCircle, { borderColor: tileConfig.color }]}>
                <FontAwesome5 name={tileConfig.icon as any} size={40} color={tileConfig.color} />
              </View>
            </View>
          );
        })()}

        {/* Player Character */}
        <Animated.View style={[
          styles.spriteContainer,
          styles.playerSprite,
          { transform: [{ translateY: walkAnim }] }
        ]}>
          <View style={styles.spriteWindow}>
            <Image
              source={HERO_IMAGES.ashenOne}
              style={[
                styles.spritesheet,
                {
                  left: -frameX * FRAME_WIDTH,
                  top: 0,
                }
              ]}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Bottom HUD - Tile info + actions */}
      <View style={styles.bottomHud}>
        <Text style={[styles.tileName, { color: isDefeated ? '#444' : tileConfig.color }]}>
          {isDefeated ? "EMPTY" : tileConfig.label}: {currentTile.name.toUpperCase()}
          {isDefeated && " (DEFEATED)"}
        </Text>
        <Text style={styles.tileDesc}>
          {isDefeated ? "A fallen foe lies here. Nothing remains." : currentTile.description}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {currentTile.type === 'bonfire' && (
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.restActionBtn]} onPress={handleTileAction}>
                <FontAwesome5 name="fire" size={14} color="#fff" />
                <Text style={styles.actionText}>REST</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.continueBtn]} onPress={handleStep}>
                <FontAwesome5 name="walking" size={14} color="#fff" />
                <Text style={styles.actionText}>CONTINUE</Text>
              </TouchableOpacity>
            </>
          )}

          {(currentTile.type === 'enemy' || currentTile.type === 'boss') && (
            isDefeated ? (
              <TouchableOpacity style={[styles.actionBtn, styles.continueBtn]} onPress={handleStep}>
                <FontAwesome5 name="walking" size={14} color="#fff" />
                <Text style={styles.actionText}>CONTINUE</Text>
              </TouchableOpacity>
            ) : encounterPhase === 'CHOICE' ? (
              <View style={styles.choiceGroup}>
                <TouchableOpacity style={[styles.choiceBtn, styles.fightChoice]} onPress={handleTileAction}>
                  <FontAwesome5 name="fist-raised" size={14} color="#fff" />
                  <Text style={styles.choiceText}>FIGHT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.choiceBtn, styles.talkChoice]} onPress={handleTalk}>
                  <FontAwesome5 name="comment" size={14} color="#fff" />
                  <Text style={styles.choiceText}>TALK</Text>
                </TouchableOpacity>
                {(() => {
                  const enemy = enemyData.enemies.find(e => e.id === currentTile.enemyId);
                  const fleeChance = enemy?.flee_chance ?? 0;
                  if (fleeChance > 0) {
                    return (
                      <TouchableOpacity style={[styles.choiceBtn, styles.fleeChoice]} onPress={handleFlee}>
                        <Text style={styles.choiceText}>FLEE ({Math.round(fleeChance * 100)}%)</Text>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })()}
              </View>
            ) : (
              <View style={styles.dialogueBox}>
                <Text style={styles.dialogueText}>{activeDialogue}</Text>
                <TouchableOpacity style={styles.dialogueNext} onPress={() => setEncounterPhase('CHOICE')}>
                  <Text style={styles.dialogueNextText}>CONTINUE</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {currentTile.type === 'chest' && (
            <TouchableOpacity style={[styles.actionBtn, styles.chestActionBtn]} onPress={handleTileAction}>
              <FontAwesome5 name="box-open" size={14} color="#fff" />
              <Text style={styles.actionText}>OPEN</Text>
            </TouchableOpacity>
          )}

          {(currentTile.type === 'path' || currentTile.type === 'event' || isDefeated) && (
            <View style={styles.movementActions}>
              <TouchableOpacity 
                style={[styles.moveBtn, isFirstTile && styles.moveBtnDisabled]} 
                onPress={handleBackwardStep}
                disabled={isFirstTile || isMoving}
              >
                <FontAwesome5 name="arrow-left" size={16} color="#fff" />
                <Text style={styles.moveBtnText}>BACKWARD</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.moveBtn, styles.forwardBtn, isLastTile && styles.moveBtnDisabled]} 
                onPress={handleStep}
                disabled={isLastTile || isMoving}
              >
                <Text style={styles.moveBtnText}>FORWARD</Text>
                <FontAwesome5 name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isLastTile && currentTile.type !== 'enemy' && currentTile.type !== 'boss' && (
          <TouchableOpacity style={styles.mapCompleteBtn} onPress={onMapComplete}>
            <FontAwesome5 name="flag-checkered" size={14} color="#ffd54f" />
            <Text style={styles.mapCompleteText}>AREA COMPLETE – RETURN TO MAP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top HUD
  topHud: {
    paddingTop: Platform.OS === 'web' ? 10 : 40,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    zIndex: 20,
  },
  topLeftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRightSide: {
    alignItems: 'flex-end',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    height: 30,
  },
  backText: { color: '#888', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  mapTitle: {
    color: '#ffb300',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  progressText: { color: '#444', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  // Progress Bar
  progressBarContainer: { paddingHorizontal: 16, marginBottom: 4 },
  progressBarBg: {
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff9800',
    borderRadius: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },

  // Walking Area
  walkingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  envLayer: {
    position: 'absolute',
    width: '120%',
    height: '110%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forestPath: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
    borderColor: '#1a1a1a',
    borderWidth: 1,
    borderLeftWidth: 50,
    borderRightWidth: 50,
  },
  fogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Tile Object
  tileObjectContainer: {
    position: 'absolute',
    top: '15%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  tileObjectImage: {
    width: 200,
    height: 200,
  },
  enemyObjectImage: {
    width: 300,
    height: 300,
  },
  enemyNameTag: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    borderWidth: 1,
  },
  enemyNameText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  tileIconContainer: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  tileIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Player
  spriteContainer: {
    position: 'absolute',
    bottom: '15%',
    zIndex: 10,
  },
  playerSprite: {
    alignSelf: 'center',
  },
  spriteWindow: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: 'hidden',
    transform: [{ scale: 1.5 }],
  },
  spritesheet: {
    width: 1080,
    height: 719,
    position: 'absolute'
  },
  movementActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 140,
    justifyContent: 'center',
  },
  forwardBtn: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderColor: '#ff9800',
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  moveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  defeatedOverlay: {
    position: 'absolute',
    top: -20,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },

  // Bottom HUD
  bottomHud: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 40,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    zIndex: 20,
  },
  tileName: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 3,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    textAlign: 'center',
  },
  tileDesc: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 1,
  },
  restActionBtn: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderColor: '#ff9800',
  },
  continueBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: '#444',
  },
  fightActionBtn: {
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderColor: '#ff4444',
  },
  chestActionBtn: {
    backgroundColor: 'rgba(255,213,79,0.15)',
    borderColor: '#ffd54f',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  tapHint: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
  },

  // Encounter Choices
  choiceGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  fightChoice: { backgroundColor: 'rgba(255,68,68,0.15)', borderColor: '#ff4444' },
  talkChoice: { backgroundColor: 'rgba(50,150,255,0.15)', borderColor: '#3296ff' },
  fleeChoice: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#444' },
  choiceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  dialogueBox: {
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  dialogueText: {
    color: '#eee',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogueNext: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dialogueNextText: {
    color: '#3296ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // Map Complete
  mapCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ffd54f',
    backgroundColor: 'rgba(255,213,79,0.1)',
    borderRadius: 4,
  },
  mapCompleteText: {
    color: '#ffd54f',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // Complete Screen
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  completeTitle: {
    color: '#ffd54f',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 5,
    marginTop: 20,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  completeSubtitle: {
    color: '#ff9800',
    fontSize: 14,
    letterSpacing: 3,
    marginTop: 8,
    fontWeight: 'bold',
  },
  completeDesc: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderRadius: 4,
  },
  returnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
