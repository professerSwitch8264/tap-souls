import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WeaponData, getWeaponById } from '../../hooks/usePlayerState';

// ===== Props =====
export interface InventoryScreenProps {
  ownedWeapons: string[];
  equippedWeaponId: string;
  onEquip: (weaponId: string) => void;
  onClose: () => void;
}

// ===== Rarity Colors =====
const RARITY_COLORS: Record<string, string> = {
  common: '#888888',
  uncommon: '#4fc3f7',
  rare: '#ffd740',
  legendary: '#ff6e40',
};

const RARITY_BG: Record<string, string> = {
  common: 'rgba(136,136,136,0.08)',
  uncommon: 'rgba(79,195,247,0.08)',
  rare: 'rgba(255,215,64,0.08)',
  legendary: 'rgba(255,110,64,0.08)',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  legendary: 'LEGENDARY',
};

// ===== Stat Bar Component =====
function StatBar({ label, value, maxValue, color, compareValue }: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  compareValue?: number;
}) {
  const pct = Math.min(100, (value / maxValue) * 100);
  const comparePct = compareValue !== undefined ? Math.min(100, (compareValue / maxValue) * 100) : undefined;
  const diff = compareValue !== undefined ? value - compareValue : 0;

  return (
    <View style={statStyles.container}>
      <View style={statStyles.labelRow}>
        <Text style={statStyles.label}>{label}</Text>
        <View style={statStyles.valueRow}>
          <Text style={statStyles.value}>{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}</Text>
          {diff !== 0 && (
            <Text style={[statStyles.diff, { color: diff > 0 ? '#4caf50' : '#ff5252' }]}>
              {diff > 0 ? `+${diff % 1 !== 0 ? diff.toFixed(1) : diff}` : `${diff % 1 !== 0 ? diff.toFixed(1) : diff}`}
            </Text>
          )}
        </View>
      </View>
      <View style={statStyles.track}>
        {comparePct !== undefined && (
          <View style={[statStyles.compareFill, { width: `${comparePct}%` }]} />
        )}
        <View style={[statStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#999', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  diff: { fontSize: 10, fontWeight: 'bold' },
  track: { height: 4, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden', position: 'relative' },
  compareFill: { position: 'absolute', height: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  fill: { height: '100%', borderRadius: 2 },
});

// ===== Weapon Card Component =====
function WeaponCard({ weapon, isEquipped, onPress }: {
  weapon: WeaponData;
  isEquipped: boolean;
  onPress: () => void;
}) {
  const rarityColor = RARITY_COLORS[weapon.rarity] || '#888';
  const rarityBg = RARITY_BG[weapon.rarity] || 'rgba(0,0,0,0.3)';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          cardStyles.card,
          { borderColor: isEquipped ? '#ffd740' : rarityColor, backgroundColor: rarityBg },
          isEquipped && cardStyles.equippedCard,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Equipped Badge */}
        {isEquipped && (
          <View style={cardStyles.equippedBadge}>
            <Text style={cardStyles.equippedBadgeText}>EQUIPPED</Text>
          </View>
        )}

        <View style={cardStyles.iconContainer}>
          <View style={[cardStyles.iconCircle, { borderColor: rarityColor }]}>
            <FontAwesome5 name={weapon.icon} size={28} color={rarityColor} />
          </View>
        </View>

        <View style={cardStyles.infoContainer}>
          <Text style={[cardStyles.weaponName, { color: rarityColor }]}>{weapon.name}</Text>
          <Text style={cardStyles.rarityTag}>{RARITY_LABELS[weapon.rarity]}</Text>
          
          <View style={cardStyles.quickStats}>
            <View style={cardStyles.quickStat}>
              <FontAwesome5 name="fist-raised" size={10} color="#ff5252" />
              <Text style={cardStyles.quickStatText}>{weapon.damage}</Text>
            </View>
            <View style={cardStyles.quickStat}>
              <FontAwesome5 name="bolt" size={10} color="#4fc3f7" />
              <Text style={cardStyles.quickStatText}>{weapon.attackSpeed}x</Text>
            </View>
            <View style={cardStyles.quickStat}>
              <FontAwesome5 name="crosshairs" size={10} color="#ffd740" />
              <Text style={cardStyles.quickStatText}>{Math.round(weapon.critRate * 100)}%</Text>
            </View>
          </View>
        </View>

        <FontAwesome5 name="chevron-right" size={14} color="#333" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  equippedCard: {
    borderWidth: 2,
    ...Platform.select({
      web: { boxShadow: '0px 0px 15px rgba(255,215,64,0.2)' } as any,
      default: {
        shadowColor: '#ffd740',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  equippedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ffd740',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  equippedBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  iconContainer: { marginRight: 14 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  infoContainer: { flex: 1 },
  weaponName: { fontSize: 13, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  rarityTag: { fontSize: 9, color: '#555', fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  quickStats: { flexDirection: 'row', gap: 16 },
  quickStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickStatText: { color: '#ccc', fontSize: 11, fontWeight: 'bold' },
});

// ===== Weapon Detail Modal =====
function WeaponDetailModal({ weapon, equippedWeapon, isEquipped, visible, onEquip, onClose }: {
  weapon: WeaponData | null;
  equippedWeapon: WeaponData | undefined;
  isEquipped: boolean;
  visible: boolean;
  onEquip: () => void;
  onClose: () => void;
}) {
  if (!weapon) return null;
  const rarityColor = RARITY_COLORS[weapon.rarity] || '#888';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={detailStyles.overlay}>
        <View style={[detailStyles.modal, { borderColor: rarityColor }]}>
          {/* Header */}
          <View style={detailStyles.header}>
            <View style={[detailStyles.iconCircleLarge, { borderColor: rarityColor }]}>
              <FontAwesome5 name={weapon.icon} size={40} color={rarityColor} />
            </View>
            <Text style={[detailStyles.weaponName, { color: rarityColor }]}>{weapon.name}</Text>
            <Text style={[detailStyles.rarityLabel, { color: rarityColor }]}>
              {RARITY_LABELS[weapon.rarity]}
            </Text>
          </View>

          {/* Description */}
          <Text style={detailStyles.description}>{weapon.description}</Text>

          {/* Divider */}
          <View style={detailStyles.divider} />

          {/* Stats */}
          <View style={detailStyles.statsSection}>
            <StatBar
              label="DAMAGE"
              value={weapon.damage}
              maxValue={40}
              color="#ff5252"
              compareValue={equippedWeapon && !isEquipped ? equippedWeapon.damage : undefined}
            />
            <StatBar
              label="ATTACK SPEED"
              value={weapon.attackSpeed}
              maxValue={2.0}
              color="#4fc3f7"
              compareValue={equippedWeapon && !isEquipped ? equippedWeapon.attackSpeed : undefined}
            />
            <StatBar
              label="CRIT RATE"
              value={weapon.critRate * 100}
              maxValue={25}
              color="#ffd740"
              compareValue={equippedWeapon && !isEquipped ? equippedWeapon.critRate * 100 : undefined}
            />
            <StatBar
              label="CRIT MULTIPLIER"
              value={weapon.critMultiplier}
              maxValue={3.0}
              color="#ff9800"
              compareValue={equippedWeapon && !isEquipped ? equippedWeapon.critMultiplier : undefined}
            />
            <StatBar
              label="STR SCALING"
              value={weapon.scaling.strength}
              maxValue={1.5}
              color="#ab47bc"
              compareValue={equippedWeapon && !isEquipped ? equippedWeapon.scaling.strength : undefined}
            />
          </View>

          {/* Lore */}
          <View style={detailStyles.divider} />
          <Text style={detailStyles.lore}>"{weapon.lore}"</Text>

          {/* Actions */}
          <View style={detailStyles.actions}>
            {!isEquipped ? (
              <TouchableOpacity
                style={[detailStyles.equipBtn, { borderColor: rarityColor }]}
                onPress={onEquip}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="hand-holding" size={16} color={rarityColor} />
                <Text style={[detailStyles.equipText, { color: rarityColor }]}>EQUIP</Text>
              </TouchableOpacity>
            ) : (
              <View style={detailStyles.equippedLabel}>
                <FontAwesome5 name="check-circle" size={16} color="#ffd740" />
                <Text style={detailStyles.equippedText}>CURRENTLY EQUIPPED</Text>
              </View>
            )}
            <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={detailStyles.closeText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    maxHeight: '85%',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  iconCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginBottom: 12,
  },
  weaponName: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center' },
  rarityLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 3, marginTop: 4 },
  description: { color: '#aaa', fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 12 },
  statsSection: { marginBottom: 4 },
  lore: { color: '#555', fontSize: 11, fontStyle: 'italic', lineHeight: 16, textAlign: 'center', marginBottom: 16 },
  actions: { gap: 10 },
  equipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  equipText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  equippedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  equippedText: { color: '#ffd740', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: { color: '#555', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
});

// ===== Main Inventory Screen =====
export function InventoryScreen({ ownedWeapons, equippedWeaponId, onEquip, onClose }: InventoryScreenProps) {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const equippedWeapon = getWeaponById(equippedWeaponId);

  const handleWeaponPress = (weapon: WeaponData) => {
    setSelectedWeapon(weapon);
    setShowDetail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEquip = () => {
    if (selectedWeapon) {
      onEquip(selectedWeapon.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDetail(false);
    }
  };

  // Sort: equipped first, then by rarity
  const rarityOrder: Record<string, number> = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
  const sortedWeapons = ownedWeapons
    .map((id) => getWeaponById(id))
    .filter(Boolean)
    .sort((a, b) => {
      if (a!.id === equippedWeaponId) return -1;
      if (b!.id === equippedWeaponId) return 1;
      return (rarityOrder[a!.rarity] ?? 99) - (rarityOrder[b!.rarity] ?? 99);
    }) as WeaponData[];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={18} color="#888" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>INVENTORY</Text>
          <Text style={styles.subtitle}>WEAPONS</Text>
        </View>
        <View style={styles.headerRight}>
          <FontAwesome5 name="suitcase" size={18} color="#444" />
          <Text style={styles.countText}>{ownedWeapons.length}</Text>
        </View>
      </View>

      {/* Currently Equipped Preview */}
      {equippedWeapon && (
        <View style={styles.equippedPreview}>
          <View style={styles.equippedRow}>
            <FontAwesome5 name="hand-holding" size={12} color="#ffd740" />
            <Text style={styles.equippedPreviewLabel}>WIELDING</Text>
          </View>
          <Text style={styles.equippedPreviewName}>{equippedWeapon.name}</Text>
          <View style={styles.equippedStatsRow}>
            <Text style={styles.equippedStatItem}>
              DMG {equippedWeapon.damage}
            </Text>
            <Text style={styles.equippedStatItem}>  •  </Text>
            <Text style={styles.equippedStatItem}>
              SPD {equippedWeapon.attackSpeed}x
            </Text>
          </View>
        </View>
      )}

      {/* Weapon List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {sortedWeapons.map((weapon) => (
          <WeaponCard
            key={weapon.id}
            weapon={weapon}
            isEquipped={weapon.id === equippedWeaponId}
            onPress={() => handleWeaponPress(weapon)}
          />
        ))}

        <View style={styles.listFooter}>
          <Text style={styles.footerText}>...SEEK MORE WEAPONS IN THE ASHEN LANDS...</Text>
        </View>
      </ScrollView>

      {/* Weapon Detail Modal */}
      <WeaponDetailModal
        weapon={selectedWeapon}
        equippedWeapon={equippedWeapon}
        isEquipped={selectedWeapon?.id === equippedWeaponId}
        visible={showDetail}
        onEquip={handleEquip}
        onClose={() => setShowDetail(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  subtitle: {
    color: '#444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    color: '#555',
    fontSize: 14,
    fontWeight: 'bold',
  },

  equippedPreview: {
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: 'rgba(255,215,64,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,64,0.15)',
    marginBottom: 20,
  },
  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  equippedPreviewLabel: {
    color: '#ffd740',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  equippedPreviewName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  equippedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equippedStatItem: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
  },

  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    color: '#222',
    fontSize: 10,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
});
