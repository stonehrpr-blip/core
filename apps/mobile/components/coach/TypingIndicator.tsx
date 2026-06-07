/** Three bouncing dots in a glassy bubble — shown while Coach is "thinking". */
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 420, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(560 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return <Animated.View style={[s.dot, { opacity, transform: [{ translateY }] }]} />;
}

export function TypingIndicator() {
  return (
    <View style={s.bubble}>
      <Dot delay={0} />
      <Dot delay={180} />
      <Dot delay={360} />
    </View>
  );
}

const s = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#8A92A6" },
});
