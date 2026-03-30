import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

interface FloatingTextProps {
  text: string;
  type: string;
}

export function FloatingDamage({ text, type }: FloatingTextProps) {
  const animY = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const animScale = useRef(new Animated.Value(2)).current; // Start pop at 2 scale

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(animY, { toValue: -80, duration: 800, useNativeDriver: true }),
      Animated.timing(animOpacity, { toValue: 0, duration: 800, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const styleObj =
    type === "PERFECT" ? styles.textPerfect : 
    type === "PARRY" ? styles.textParry : 
    styles.textDamage;

  return (
    <Animated.Text 
      style={[
        styles.floatingText, 
        styleObj, 
        { transform: [{ translateY: animY }, { scale: animScale }], opacity: animOpacity }
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  floatingText: { 
    position: "absolute", 
    fontSize: 28, 
    fontWeight: "bold", 
    textShadowColor: "rgba(0, 0, 0, 0.9)", 
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 4 
  },
  textDamage: { color: "#fff", textShadowColor: "#000" },
  textPerfect: { color: "#80deea", fontStyle: "italic", letterSpacing: 2, fontSize: 32, textShadowColor: '#00bcd4', textShadowRadius: 8 },
  textParry: { color: "#ffeb3b", fontStyle: "italic", letterSpacing: 2, fontSize: 30, textShadowColor: '#fbc02d', textShadowRadius: 8 },
});
