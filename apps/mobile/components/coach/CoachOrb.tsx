/**
 * The Coach presence orb — a glowing electric-blue sphere that gently pulses.
 * Ported from the previews' .coach-orb (39-coach.html) and the quest orb glow.
 * Pure visual, no state.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ACCENT } from "./tokens";

export function CoachOrb({ size = 38 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* glow halo */}
      <Animated.View
        style={{
          position: "absolute",
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size,
          backgroundColor: ACCENT,
          opacity: haloOpacity,
          transform: [{ scale }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          transform: [{ scale }],
          shadowColor: ACCENT,
          shadowOpacity: 0.9,
          shadowRadius: size * 0.5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 14,
        }}
      >
        <LinearGradient
          colors={["#DCEBFF", ACCENT, "#1856B8"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.3, y: 0.25 }}
          end={{ x: 0.8, y: 1 }}
          style={{ flex: 1 }}
        />
        {/* specular highlight */}
        <View
          style={{
            position: "absolute",
            top: size * 0.12,
            left: size * 0.14,
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size,
            backgroundColor: "rgba(255,255,255,0.55)",
          }}
        />
      </Animated.View>
    </View>
  );
}
