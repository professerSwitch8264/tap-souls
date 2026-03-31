import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { CONFIG } from '../../constants/GameConfig';
import { router } from 'expo-router';

const AVATARS = [
  { id: 'ninja', name: 'user-ninja', color: '#4caf50', title: 'THE NINJA' },
  { id: 'knight', name: 'chess-knight', color: '#ff9800', title: 'ASHEN ONE' },
  { id: 'dragon', name: 'dragon', color: '#f44336', title: 'DRAGONBORN' },
  { id: 'skull', name: 'skull', color: '#e0e0e0', title: 'UNDEAD' },
  { id: 'ghost', name: 'ghost', color: '#00bcd4', title: 'WRAITH' },
];

const INITIAL_MAIL = [
  {
    id: 'welcome',
    from: 'TAP SOULS',
    subject: '⚔️ ยินดีต้อนรับสู่ Tap Souls!',
    body: 'นักรบผู้กล้า...\n\nยินดีต้อนรับสู่ดินแดนแห่งมืดมน ที่นี่คุณจะต้องเผชิญหน้ากับบอสสุดโหด!\n\n🗡️ แตะเพื่อโจมตี\n🛡️ ปัดเพื่อหลบ\n⚡ จับจังหวะให้ดีเพื่อกระตุ้น Witch Time!\n\nขอให้โชคดี นักรบ!\n\n— ทีม Tap Souls',
    date: 'วันนี้',
    read: false,
    icon: 'scroll',
    iconColor: '#ffca28',
  },
];

const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'] as const;

export function ProfileButton({ hp = 100 }: { hp?: number }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [mailModalVisible, setMailModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[1]);

  // Mailbox state
  const [mails, setMails] = useState(INITIAL_MAIL);
  const [openMail, setOpenMail] = useState<typeof INITIAL_MAIL[0] | null>(null);

  // Settings state
  const [haptics, setHaptics] = useState(true);
  const [screenShake, setScreenShake] = useState(true);
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('NORMAL');

  const unreadCount = mails.filter(m => !m.read).length;

  const handleOpenMail = (mail: typeof INITIAL_MAIL[0]) => {
    setMails(prev => prev.map(m => m.id === mail.id ? { ...m, read: true } : m));
    setOpenMail(mail);
  };

  return (
    <View style={styles.navbarContainer}>
      
      {/* Left HUD Layout */}
      <TouchableOpacity style={styles.hudContainer} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <View style={styles.barBg}>
          <View style={styles.nameSection}>
            <FontAwesome5 name="user-circle" size={14} color="#888" style={{marginRight: 6}} />
            <Text style={styles.hudName}>{selectedAvatar.title}</Text>
          </View>
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${hp}%`, backgroundColor: '#ff5252' }]} />
            </View>
            <Text style={[styles.progressText, { color: '#ff5252' }]}>{hp}%</Text>
          </View>
        </View>
        <View style={[styles.avatarBox, { borderColor: selectedAvatar.color }]}>
          <FontAwesome5 name={selectedAvatar.name as any} size={28} color={selectedAvatar.color} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv. 4</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right Icons: Expanding Menu */}
      <View style={styles.rightIconsContainer}>
        {menuExpanded && (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setMailModalVisible(true); setMenuExpanded(false); }}>
              <FontAwesome5 name="envelope" size={20} color="#aaa" />
              {unreadCount > 0 && <View style={styles.redDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setSettingsVisible(true); setMenuExpanded(false); }}>
              <FontAwesome5 name="cog" size={20} color="#aaa" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuExpanded(!menuExpanded)}>
          <FontAwesome5 name={menuExpanded ? "times" : "bars"} size={22} color="#aaa" />
          {!menuExpanded && unreadCount > 0 && <View style={styles.redDot} />}
        </TouchableOpacity>
      </View>

      {/* ========== PROFILE MODAL ========== */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>MENU & PROFILE</Text>
            
            <View style={[styles.largeAvatarFrame, { borderColor: selectedAvatar.color }]}>
              <FontAwesome5 name={selectedAvatar.name as any} size={60} color={selectedAvatar.color} />
            </View>
            
            <Text style={[styles.heroName, { color: selectedAvatar.color, textShadowColor: selectedAvatar.color }]}>
              {selectedAvatar.title}
            </Text>

            <View style={styles.avatarSelectionBox}>
              <Text style={styles.selectionTitle}>SELECT AVATAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {AVATARS.map((ava) => (
                  <TouchableOpacity 
                    key={ava.id} 
                    style={[
                      styles.avatarOption, 
                      selectedAvatar.id === ava.id && { borderColor: ava.color, backgroundColor: 'rgba(255,255,255,0.1)' }
                    ]}
                    onPress={() => setSelectedAvatar(ava)}
                  >
                    <FontAwesome5 name={ava.name as any} size={24} color={ava.color} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>MAX HP:</Text>
                <Text style={styles.statValue}>100</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>ATTACK PWR:</Text>
                <Text style={styles.statValue}>{CONFIG.PLAYER.ATTACK.damage}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>ATK WIND-UP:</Text>
                <Text style={styles.statValue}>{CONFIG.PLAYER.ATTACK.windUp}ms</Text>
              </View>
            </View>

            <View style={styles.actionsBox}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quitBtn} onPress={() => { setModalVisible(false); router.replace('/'); }}>
                <Text style={styles.quitBtnText}>QUIT BATTLE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== MAILBOX MODAL ========== */}
      <Modal visible={mailModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            {openMail ? (
              <>
                {/* Reading a single mail */}
                <TouchableOpacity style={styles.mailBackRow} onPress={() => setOpenMail(null)}>
                  <FontAwesome5 name="arrow-left" size={14} color="#aaa" />
                  <Text style={styles.mailBackText}>INBOX</Text>
                </TouchableOpacity>

                <View style={styles.mailHeader}>
                  <FontAwesome5 name={openMail.icon as any} size={30} color={openMail.iconColor} />
                  <Text style={styles.mailSubject}>{openMail.subject}</Text>
                  <View style={styles.mailMeta}>
                    <Text style={styles.mailFrom}>From: {openMail.from}</Text>
                    <Text style={styles.mailDate}>{openMail.date}</Text>
                  </View>
                </View>

                <View style={styles.mailDivider} />

                <ScrollView style={styles.mailBodyScroll}>
                  <Text style={styles.mailBody}>{openMail.body}</Text>
                </ScrollView>

                <TouchableOpacity style={styles.closeBtn} onPress={() => { setOpenMail(null); setMailModalVisible(false); }}>
                  <Text style={styles.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Mail list */}
                <View style={styles.mailTitleRow}>
                  <FontAwesome5 name="envelope-open-text" size={18} color="#ffca28" />
                  <Text style={styles.mailTitleText}>INBOX</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>

                <ScrollView style={styles.mailListScroll}>
                  {mails.map((mail) => (
                    <TouchableOpacity 
                      key={mail.id} 
                      style={[styles.mailItem, !mail.read && styles.mailItemUnread]}
                      onPress={() => handleOpenMail(mail)}
                    >
                      <View style={styles.mailItemIcon}>
                        <FontAwesome5 name={mail.icon as any} size={20} color={mail.iconColor} />
                        {!mail.read && <View style={styles.mailDotInline} />}
                      </View>
                      <View style={styles.mailItemContent}>
                        <Text style={[styles.mailItemSubject, !mail.read && { color: '#fff' }]}>{mail.subject}</Text>
                        <Text style={styles.mailItemFrom}>{mail.from} • {mail.date}</Text>
                      </View>
                      <FontAwesome5 name="chevron-right" size={12} color="#555" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setMailModalVisible(false)}>
                  <Text style={styles.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========== SETTINGS MODAL ========== */}
      <Modal visible={settingsVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.settingsTitleRow}>
              <FontAwesome5 name="cog" size={18} color="#aaa" />
              <Text style={styles.settingsTitleText}>SETTINGS</Text>
            </View>

            {/* Haptic Feedback */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <FontAwesome5 name="mobile-alt" size={16} color="#aaa" style={{ width: 24 }} />
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              <Switch
                value={haptics}
                onValueChange={setHaptics}
                trackColor={{ false: '#333', true: '#00e5ff55' }}
                thumbColor={haptics ? '#00e5ff' : '#888'}
              />
            </View>

            {/* Screen Shake */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <FontAwesome5 name="compress-arrows-alt" size={16} color="#aaa" style={{ width: 24 }} />
                <Text style={styles.settingLabel}>Screen Shake</Text>
              </View>
              <Switch
                value={screenShake}
                onValueChange={setScreenShake}
                trackColor={{ false: '#333', true: '#00e5ff55' }}
                thumbColor={screenShake ? '#00e5ff' : '#888'}
              />
            </View>

            {/* Difficulty */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <FontAwesome5 name="skull-crossbones" size={16} color="#aaa" style={{ width: 24 }} />
                <Text style={styles.settingLabel}>Difficulty</Text>
              </View>
            </View>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.difficultyBtn,
                    difficulty === d && styles.difficultyBtnActive,
                    d === 'EASY' && difficulty === d && { borderColor: '#4caf50' },
                    d === 'HARD' && difficulty === d && { borderColor: '#f44336' },
                  ]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[
                    styles.difficultyText,
                    difficulty === d && styles.difficultyTextActive,
                    d === 'EASY' && difficulty === d && { color: '#4caf50' },
                    d === 'HARD' && difficulty === d && { color: '#f44336' },
                  ]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Separator */}
            <View style={styles.settingDivider} />

            {/* About */}
            <View style={styles.aboutRow}>
              <Text style={styles.aboutText}>TAP SOULS v1.0</Text>
              <Text style={styles.aboutSub}>A Dark Souls-inspired tap game</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  hudContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    width: 250,
  },
  barBg: {
    marginLeft: 30,
    paddingLeft: 35,
    width: 200,
    height: 48,
    backgroundColor: '#262421',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderLeftWidth: 0,
    position: 'relative',
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hudName: {
    color: '#eee',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  progressBarWrapper: {
    position: 'absolute',
    bottom: 4,
    left: 30,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#111',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: 2,
  },
  progressText: {
    color: '#00e5ff',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 35,
  },
  avatarBox: {
    position: 'absolute',
    left: 0,
    top: 5,
    width: 54,
    height: 54,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#666',
  },
  levelText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginLeft: 10,
  },
  redDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    backgroundColor: 'red',
    borderRadius: 4,
  },

  // ── Shared modal ──
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
  },
  largeAvatarFrame: {
    width: 110,
    height: 110,
    borderWidth: 3,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 15,
  },
  heroName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
    textShadowColor: 'red',
    textShadowRadius: 10,
  },
  avatarSelectionBox: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
  },
  selectionTitle: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  avatarOption: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: '#333',
    paddingTop: 15,
    marginBottom: 25,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statValue: {
    color: '#ffca28',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsBox: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  closeBtn: {
    paddingVertical: 12,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  quitBtn: {
    paddingVertical: 12,
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: 8,
    alignItems: 'center',
  },
  quitBtnText: {
    color: '#ff5252',
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // ── Mailbox styles ──
  mailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  mailTitleText: {
    color: '#ffca28',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  unreadBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mailListScroll: {
    width: '100%',
    marginBottom: 20,
  },
  mailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  mailItemUnread: {
    borderColor: '#ffca28',
    backgroundColor: 'rgba(255,202,40,0.05)',
  },
  mailItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  mailDotInline: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    backgroundColor: 'red',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111',
  },
  mailItemContent: {
    flex: 1,
  },
  mailItemSubject: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  mailItemFrom: {
    color: '#555',
    fontSize: 11,
  },

  // Mail detail view
  mailBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  mailBackText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  mailHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  mailSubject: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  mailMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  mailFrom: {
    color: '#888',
    fontSize: 11,
  },
  mailDate: {
    color: '#555',
    fontSize: 11,
  },
  mailDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#333',
    marginVertical: 15,
  },
  mailBodyScroll: {
    width: '100%',
    marginBottom: 20,
    maxHeight: 200,
  },
  mailBody: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Settings styles ──
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 25,
  },
  settingsTitleText: {
    color: '#aaa',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  settingRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  difficultyRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    marginBottom: 5,
  },
  difficultyBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  difficultyBtnActive: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  difficultyText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  difficultyTextActive: {
    color: '#00e5ff',
  },
  settingDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#333',
    marginVertical: 15,
  },
  aboutRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  aboutText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  aboutSub: {
    color: '#444',
    fontSize: 11,
    marginTop: 4,
  },
});
