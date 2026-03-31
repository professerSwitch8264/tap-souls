import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../constants/GameConfig";
import { HERO_IMAGES, getEnemyImageByEnemyId, getGameImage } from "../../constants/ImageRegistry";
import enemyData from "../../data/enemies.json";
import { ProfileButton } from '../ui/ProfileButton';

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
  moveToNextTile?: () => void;
  moveToPreviousTile?: () => void;
  moveInDirection: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => boolean;
  defeatedTiles: number[];
  exploredTiles: number[];
  hp: number;
  onEncounter: (enemyId?: string) => void;
  onRest: () => void;
  onMapComplete: () => void;
  onReturnToMap: () => void;
  mapId: string;
  mapName: string;
}

export function WalkingZone({
  tiles,
  currentTileIndex,
  moveInDirection,
  defeatedTiles = [],
  exploredTiles = [],
  hp = 100,
  onEncounter,
  onRest,
  onMapComplete,
  onReturnToMap,
  mapId,
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
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);

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

  const handleMove = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (isMoving) return;
    
    // Check if move is valid via hook
    const success = moveInDirection(direction);
    if (!success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsMoving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Direction-based slide animation
    const slideTo = direction === 'UP' || direction === 'LEFT' ? -20 : 20;
    const isVertical = direction === 'UP' || direction === 'DOWN';

    Animated.parallel([
      Animated.sequence([
        Animated.timing(walkAnim, { toValue: slideTo, duration: 150, useNativeDriver: true }),
        Animated.timing(walkAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(envScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(envScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setIsMoving(false);
    });

    setFrameX(f => (f + 1) % 3);
  };

  const handleStep = () => {
    // Legacy fallback for linear maps if still used (not needed for 2D)
    handleMove('UP');
  };

  const hasAction = (currentTile.type === 'bonfire') || 
                    ((currentTile.type === 'enemy' || currentTile.type === 'boss') && !isDefeated) || 
                    currentTile.type === 'chest';

  // Swipe Gesture logic
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const threshold = 40;

      if (Math.abs(translationX) > Math.abs(translationY)) {
        // Horizontal swipe
        if (translationX > threshold) handleMove('RIGHT');
        else if (translationX < -threshold) handleMove('LEFT');
      } else {
        // Vertical swipe
        if (translationY > threshold) handleMove('DOWN');
        else if (translationY < -threshold) handleMove('UP');
      }
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
       if (!hasAction) handleStep();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

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
      alert("Escaped successfully! You retreat to safety.");
      handleMove('DOWN');
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
    } else if (currentTile.type === 'chest' || currentTile.loot) {
      // Collect loot!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const souls = currentTile.loot?.souls || 0;
      const items = currentTile.loot?.items || [];
      
      let message = "";
      if (souls > 0) message += `Found: ${souls} souls! `;
      if (items.length > 0) message += `Found: ${items.join(', ')}!`;
      
      if (message) alert(message);
      
      // Mark as defeated/collected if it's a chest or has loot
      onEncounter("loot_collected"); // Dummy call to mark tile, or we should have onDefeat
      // Actually we'll just check if it's defeated/collected
      handleMove('UP'); // Auto-advance? Maybe not in 2D. 
    }
  };



  return (
    <View style={styles.container}>
      {/* Top HUD - Clean profile & Map Name */}
      <View style={styles.topHud}>
        <View style={styles.topHudMain}>
          <ProfileButton hp={hp} containerStyle={{ flex: 1 }} />
          
          <View style={styles.topHeaderGroup}>
            <View style={styles.topHeaderInfo}>
              <Text style={styles.mapTitle} numberOfLines={1}>{mapName.toUpperCase()}</Text>
              <View style={styles.progressRow}>
                 <Text style={styles.progressTextSmall}>{Math.round((exploredTiles.length / totalTiles) * 100)}%</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.fullMapToggle} onPress={() => setIsFullMapOpen(true)}>
              <FontAwesome5 name="map-marked-alt" size={14} color="#ffd54f" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating Interaction Hub (MIDDLE-RIGHT) - Soul Actions */}
      <View style={styles.floatingInteractionHub}>
        {currentTile.type === 'bonfire' && (
          <TouchableOpacity 
            style={[styles.soulActionBtn, styles.restActionBorder]} 
            onPress={handleTileAction}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="fire" size={20} color="#ff9800" />
            <Text style={styles.soulActionText}>REST</Text>
          </TouchableOpacity>
        )}

        {(currentTile.type === 'enemy' || currentTile.type === 'boss') && !isDefeated && (
          encounterPhase === 'CHOICE' ? (
            <View style={styles.soulActionStack}>
              <TouchableOpacity 
                style={[styles.soulActionBtn, styles.fightActionBorder]} 
                onPress={handleTileAction}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="fist-raised" size={20} color="#ff4444" />
                <Text style={styles.soulActionText}>FIGHT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.soulSubActionBtn} onPress={handleTalk}>
                <FontAwesome5 name="comment" size={10} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.floatingDialogue}>
              <Text style={styles.floatingDialogueText}>{activeDialogue}</Text>
              <TouchableOpacity style={styles.dialogueNext} onPress={() => setEncounterPhase('CHOICE')}>
                <Text style={styles.dialogueNextText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {currentTile.type === 'chest' && (
          <TouchableOpacity 
            style={[styles.soulActionBtn, styles.chestActionBorder]} 
            onPress={handleTileAction}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="box-open" size={20} color="#ffd54f" />
            <Text style={styles.soulActionText}>OPEN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Scene */}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.walkingArea}>
          {/* Background */}
          <Animated.View style={[styles.envLayer, { transform: [{ scale: envScale }], opacity: envOpacity }]}>
            <View style={styles.forestPath} />
            <View style={styles.fogOverlay} />
          </Animated.View>

          {/* Tile Object - Show actual image */}
          {(() => {
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
                      (currentTile.type === 'enemy' || currentTile.type === 'boss') && styles.enemyObjectImage,
                    ]}
                    resizeMode="contain"
                  />
                </Animated.View>
              );
            }

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
        </View>
      </GestureDetector>

      {/* Bottom HUD - Tactical Dashboard */}
      <View style={styles.bottomHud}>
        <View style={styles.tileInfoContainer}>
          <Text style={[styles.tileName, { color: isDefeated ? '#444' : tileConfig.color }]}>
            {isDefeated ? "EMPTY" : tileConfig.label}: {currentTile.name.toUpperCase()}
          </Text>
          <Text style={styles.tileDesc} numberOfLines={2}>
            {isDefeated ? "A fallen foe lies here. Nothing remains." : currentTile.description}
          </Text>
        </View>

        <View style={styles.bottomNavRow}>
           {/* Tactical Mini-Map centered */}
           <TouchableOpacity 
             activeOpacity={0.8}
             style={styles.tacticalMapPanel} 
             onPress={() => setIsFullMapOpen(true)}
           >
             <View style={styles.miniMapGrid}>
               {[1, 0, -1].map(dy => (
                 <View key={dy} style={styles.miniMapRow}>
                   {[-1, 0, 1].map(dx => {
                     const targetX = (currentTile as any).x + dx;
                     const targetY = (currentTile as any).y + dy;
                     const tile = tiles.find(t => t.x === targetX && t.y === targetY);
                     const tIdx = tile ? tiles.indexOf(tile) : -1;
                     const isExplored = exploredTiles.includes(tIdx);
                     const isCurrent = dx === 0 && dy === 0;

                     return (
                       <View 
                         key={dx} 
                         style={[
                           styles.miniMapCell,
                           isCurrent && styles.miniMapCellCurrent,
                           tile && isExplored && { borderColor: (TILE_TYPE_CONFIG[tile.type]?.color || '#333') + '66' },
                           !tile && styles.miniMapCellEmpty
                         ]} 
                       >
                         {tile && isExplored && (
                           <FontAwesome5 
                             name={TILE_TYPE_CONFIG[tile.type]?.icon as any} 
                             size={5} 
                             color={isCurrent ? '#fff' : (TILE_TYPE_CONFIG[tile.type]?.color || '#444') + 'aa'} 
                           />
                         )}
                       </View>
                     );
                   })}
                 </View>
               ))}
             </View>
           </TouchableOpacity>
        </View>

        {isLastTile && currentTile.type !== 'enemy' && currentTile.type !== 'boss' && (
          <TouchableOpacity style={styles.mobileMapCompleteBtn} onPress={onMapComplete}>
            <FontAwesome5 name="flag-checkered" size={12} color="#ffd54f" />
            <Text style={styles.mobileMapCompleteText}>AREA COMPLETE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FULL SCREEN MASTER MAP MODAL */}
      <Modal visible={isFullMapOpen} transparent animationType="fade" onRequestClose={() => setIsFullMapOpen(false)}>
        <View style={styles.masterMapOverlay}>
          <View style={styles.masterMapContainer}>
            <View style={styles.masterMapHeader}>
              <Text style={styles.masterMapTitle}>MASTER MAP: {mapName.toUpperCase()}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsFullMapOpen(false)}>
                <FontAwesome5 name="times" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.masterMapGrid}>
              {Array.from({ length: 11 }, (_, i) => 5 - i).map(dy => (
                <View key={dy} style={styles.masterMapRow}>
                  {Array.from({ length: 11 }, (_, i) => i - 5).map(dx => {
                    const targetX = (currentTile as any).x + dx;
                    const targetY = (currentTile as any).y + dy;
                    const tile = tiles.find(t => t.x === targetX && t.y === targetY);
                    const tIdx = tile ? tiles.indexOf(tile) : -1;
                    const isExplored = exploredTiles.includes(tIdx);
                    const isCurrent = dx === 0 && dy === 0;

                    return (
                      <View 
                        key={dx} 
                        style={[
                          styles.masterMapCell,
                          isCurrent && styles.masterMapCellCurrent,
                          tile && isExplored && { borderColor: TILE_TYPE_CONFIG[tile.type]?.color + 'aa' || '#333' },
                          !tile && styles.masterMapCellEmpty
                        ]} 
                      >
                        {tile && isExplored && (
                          <FontAwesome5 
                            name={TILE_TYPE_CONFIG[tile.type]?.icon as any} 
                            size={12} 
                            color={isCurrent ? '#fff' : (TILE_TYPE_CONFIG[tile.type]?.color || '#444')} 
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.masterMapFooter}>
              <View style={styles.legendRow}>
                {Object.entries(TILE_TYPE_CONFIG).map(([type, cfg]) => (
                  <View key={type} style={styles.legendItem}>
                    <FontAwesome5 name={cfg.icon as any} size={10} color={cfg.color} />
                    <Text style={styles.legendText}>{cfg.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.masterMapStats}>EXPLORATION PROGRESS: {Math.round((exploredTiles.length / totalTiles) * 100)}%</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top HUD
  topHud: {
    paddingTop: Platform.OS === 'web' ? 10 : 40,
    backgroundColor: '#050505',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    zIndex: 20,
    paddingBottom: 8,
  },
  topHudMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    width: '100%',
    gap: 4,
  },
  topHudInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#111',
  },
  progressBadge: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  backText: { color: '#888', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  topHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#222',
    maxWidth: 140,
  },
  topHeaderInfo: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  progressBarBgSmall: {
    display: 'none', // Remove bar to save space in header
    width: 40,
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressTextSmall: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
  },
  fullMapToggle: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,213,79,0.2)',
  },
  mapTitle: {
    color: '#ffb300',
    fontSize: 14,
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
    borderLeftWidth: Platform.OS === 'web' ? 100 : 50,
    borderRightWidth: Platform.OS === 'web' ? 100 : 50,
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
    gap: 10,
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 10,
  },
  moveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
  },
  forwardBtn: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderColor: '#ff9800',
  },
  moveBtnDisabled: {
    opacity: 0.1,
  },
  moveBtnText: {
    color: '#fff',
    fontSize: 11,
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
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ffd54f',
    backgroundColor: 'rgba(255,213,79,0.1)',
    borderRadius: 8,
  },

  // Layout Swap Redesign
  floatingInteractionHub: {
    position: 'absolute',
    right: 20,
    top: '38%', // Adjusted for middle-right thumb reach
    zIndex: 60,
    alignItems: 'flex-end',
    gap: 15,
  },
  soulActionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  restActionBorder: { borderColor: '#ff9800' },
  fightActionBorder: { borderColor: '#ff4444' },
  chestActionBorder: { borderColor: '#ffd54f' },
  soulActionText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 1.5,
  },
  soulActionStack: { position: 'relative' },
  soulSubActionBtn: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3296ff',
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingDialogue: {
    width: 180,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3296ff',
  },
  floatingDialogueText: {
    color: '#eee',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Tactical Integrated Mini-Map
  tacticalMapPanel: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(5,5,5,0.95)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapGrid: { gap: 2 },
  miniMapRow: { flexDirection: 'row', gap: 2 },
  miniMapCell: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapCellEmpty: { opacity: 0.05 },
  miniMapCellCurrent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#fff',
    borderWidth: 1,
  },

  // Bottom Nav Row optimization
  tileInfoContainer: {
    width: '100%',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Now centered since D-Pad is gone
    paddingTop: 10,
    minHeight: 100,
  },
  movementZone: {
    display: 'none',
  },
  mobileMapCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 5,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,213,79,0.05)',
    borderRadius: 8,
  },
  mobileMapCompleteText: {
    color: '#ffd54f',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // D-Pad refinements (already correct but ensure consistent sizing)
  compassContainer: { display: 'none' },
  compassMiddleRow: { display: 'none' },
  compassBtn: { display: 'none' },
  compassCenter: { display: 'none' },
  compassInnerCircle: { display: 'none' },
  compassUP: { display: 'none' },
  compassDOWN: { display: 'none' },
  compassLEFT: { display: 'none' },
  compassRIGHT: { display: 'none' },

  // Master Map Modal (Mobile Adapative)
  masterMapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  masterMapContainer: {
    width: '94%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  masterMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  masterMapTitle: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  closeBtn: { padding: 8 },
  masterMapGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    padding: 8,
    backgroundColor: '#050505',
    borderRadius: 12,
    transform: [{ scale: 0.95 }], // Scale down slightly to ensure fit
  },
  masterMapRow: { flexDirection: 'row', gap: 2.5 },
  masterMapCell: {
    width: 20, // Slightly smaller cells for mobile
    height: 20,
    backgroundColor: '#111',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  masterMapCellEmpty: { opacity: 0.1 },
  masterMapCellCurrent: {
    backgroundColor: '#222',
    borderColor: '#fff',
    borderWidth: 1,
  },
  masterMapFooter: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 10,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    color: '#666',
    fontSize: 9,
    fontWeight: 'bold',
  },
  masterMapStats: {
    color: '#444',
    fontSize: 9,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // World Hints
  directionalHints: { display: 'none' },
  hintArrow: { display: 'none' },
  hintUP: { display: 'none' },
  hintDOWN: { display: 'none' },
  hintLEFT: { display: 'none' },
  hintRIGHT: { display: 'none' },
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
