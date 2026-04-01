import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function MainMenu() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TAP SOULS</Text>
      
      <TouchableOpacity 
        style={styles.startBtn} 
        onPress={() => router.push('/game')}
      >
        <Text style={styles.startText}>TAP TO START</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000' 
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ffb300',
    marginBottom: 50,
    letterSpacing: 6,
    fontFamily: 'serif',
    textShadowColor: 'rgba(255, 170, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  startBtn: { 
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  startText: { 
    color: 'white', 
    fontSize: 20,
    fontWeight: 'bold', 
    letterSpacing: 3 
  }
});
