/**
 * Stylized front-body muscle map. Reads a muscle map (level + status per group)
 * and colours each region weak→strong. Used in the Physique Scanner results and
 * available to the Strength screen (same shared store shape).
 */
import { View } from "react-native";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";
import type { MuscleKey, MuscleMap, MuscleStatus } from "@/stores/game-state-store";

const STATUS_COLOR: Record<MuscleStatus, string> = {
  weak: "#FF7A45", // amber/red — needs work
  ok: "#4A8FFF", // electric blue — solid
  strong: "#34D399", // green — bright/developed
};

// opacity ramps with level so "faded vs bright" reads at a glance
function fill(map: MuscleMap, key: MuscleKey): { color: string; opacity: number } {
  const m = map[key];
  const status = m?.status ?? "ok";
  const level = m?.level ?? 50;
  return { color: STATUS_COLOR[status], opacity: 0.28 + (level / 100) * 0.62 };
}

export function BodyMap({ muscles, size = 200 }: { muscles: MuscleMap; size?: number }) {
  const h = size * 1.6;
  const r = (k: MuscleKey) => fill(muscles, k);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={h} viewBox="0 0 100 160">
        {/* base silhouette */}
        <G opacity={0.9}>
          {/* head */}
          <Circle cx={50} cy={14} r={9} fill="#11131f" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
          {/* shoulders */}
          <Path d="M30 30 Q50 24 70 30 L66 40 Q50 34 34 40 Z" fill={r("shoulders").color} opacity={r("shoulders").opacity} />
          {/* chest */}
          <Path d="M35 40 Q50 36 65 40 L63 58 Q50 64 37 58 Z" fill={r("chest").color} opacity={r("chest").opacity} />
          {/* arms */}
          <Ellipse cx={27} cy={52} rx={6.5} ry={18} fill={r("arms").color} opacity={r("arms").opacity} />
          <Ellipse cx={73} cy={52} rx={6.5} ry={18} fill={r("arms").color} opacity={r("arms").opacity} />
          {/* core */}
          <Path d="M38 60 L62 60 L60 84 Q50 90 40 84 Z" fill={r("core").color} opacity={r("core").opacity} />
          {/* legs */}
          <Path d="M40 86 Q50 92 60 86 L58 140 L52 140 L50 100 L48 140 L42 140 Z" fill={r("legs").color} opacity={r("legs").opacity} />
          {/* back marker (small chip behind shoulders to acknowledge it's rated) */}
          <Circle cx={50} cy={30} r={2.4} fill={r("back").color} opacity={r("back").opacity} />
        </G>
        {/* outline */}
        <Path
          d="M30 30 Q50 24 70 30 L66 42 Q73 44 73 52 Q73 66 66 70 L62 84 L58 140 L52 140 L50 102 L48 140 L42 140 L38 84 L34 70 Q27 66 27 52 Q27 44 34 42 Z"
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
