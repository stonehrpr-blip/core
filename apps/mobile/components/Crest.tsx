/**
 * Crest — shared rank-badge renderer (extracted from app/(tabs)/ranks.tsx).
 *
 * react-native-svg, 4-layer system (outer ring → field → specular → bezel → glyph)
 * banded into hex / shield / sunburst / radiant by tier index. Used by the Ranks
 * tab ladder and the Profile player card.
 *
 * Animation budget: this component is static. Callers wrap it in a Reanimated
 * pulse if they want motion (see ranks.tsx hero + RankGemCard).
 */
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLG,
  Path,
  Polygon,
  RadialGradient as SvgRG,
  Stop,
} from "react-native-svg";

import { GAME_RANKS, type Rank } from "@/stores/game-state-store";

export type BandName = "hex" | "shield" | "sunburst" | "radiant";
export const TIER_BAND: BandName[] = ["hex", "hex", "hex", "shield", "shield", "shield", "sunburst", "sunburst", "radiant", "radiant"];

export function GlyphFor({ name }: { name: string }) {
  switch (name) {
    case "Iron":
      return <Path d="M50 32 L60 50 L50 68 L40 50 Z" />;
    case "Bronze":
      return (
        <>
          <Path d="M34 36 L66 36 L60 64 L40 64 Z" />
          <Path d="M40 44 L60 44" stroke="rgba(0,0,0,0.18)" strokeWidth={1.5} fill="none" />
        </>
      );
    case "Silver":
      return (
        <>
          <Path d="M50 30 L68 50 L50 70 L32 50 Z" />
          <Circle cx="50" cy="50" r={5} fill="rgba(255,255,255,0.5)" />
        </>
      );
    case "Gold":
      return <Path d="M50 30 L55 44 L70 45 L59 54 L62 68 L50 60 L38 68 L41 54 L30 45 L45 44 Z" />;
    case "Emerald":
      return (
        <>
          <Path d="M40 32 L60 32 L68 50 L60 68 L40 68 L32 50 Z" />
          <Path d="M40 32 L50 50 L40 68 M60 32 L50 50 L60 68" stroke="rgba(0,0,0,0.18)" strokeWidth={1} fill="none" />
        </>
      );
    case "Platinum":
      return (
        <>
          <Path d="M50 26 L57 40 L72 42 L61 52 L64 67 L50 60 L36 67 L39 52 L28 42 L43 40 Z" />
          <Circle cx="50" cy="52" r={3} fill="rgba(255,255,255,0.55)" />
        </>
      );
    case "Diamond":
      return (
        <>
          <Path d="M50 28 L70 46 L60 70 L40 70 L30 46 Z" />
          <Path d="M50 28 L40 46 L50 70 L60 46 Z" fill="rgba(255,255,255,0.18)" />
        </>
      );
    case "Master":
      return (
        <>
          <Path d="M50 26 L58 38 L72 40 L62 50 L65 66 L50 58 L35 66 L38 50 L28 40 L42 38 Z" />
          <Circle cx="50" cy="50" r={7} fill="rgba(0,0,0,0.18)" />
          <Circle cx="50" cy="50" r={3} fill="rgba(255,255,255,0.6)" />
        </>
      );
    case "Grandmaster":
      return <Path d="M50 26 L56 38 L70 36 L65 48 L76 56 L62 58 L60 72 L50 64 L40 72 L38 58 L24 56 L35 48 L30 36 L44 38 Z" />;
    case "Legend":
      return (
        <>
          <Path d="M50 22 L57 34 L72 30 L66 44 L80 50 L66 56 L72 70 L57 66 L50 78 L43 66 L28 70 L34 56 L20 50 L34 44 L28 30 L43 34 Z" />
          <Circle cx="50" cy="50" r={5} fill="rgba(255,255,255,0.55)" />
        </>
      );
    default:
      return <Circle cx="50" cy="50" r={14} />;
  }
}

export function Crest({ rank, size, dim }: { rank: Rank & { idx?: number }; size: number; dim?: boolean }) {
  const idx = typeof rank.idx === "number" ? rank.idx : GAME_RANKS.findIndex((r) => r.name === rank.name);
  const band = TIER_BAND[idx] || "hex";
  const fid = `cf_${rank.name}_${size}`;
  const sid = `cs_${rank.name}_${size}`;
  const fieldOp = dim ? 0.35 : 1;
  const specOp = dim ? 0.1 : 0.32;
  const ringColor = dim ? "rgba(255,255,255,0.10)" : rank.glow;
  const ringStroke = band === "sunburst" || band === "radiant" ? 1.4 : 2;
  const glyphFill = dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.94)";

  return (
    <View
      style={{
        shadowColor: dim ? "transparent" : rank.glow,
        shadowOpacity: dim ? 0 : 0.6,
        shadowRadius: size > 80 ? 18 : 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: dim ? 0 : 12,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <SvgLG id={fid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={rank.c1} stopOpacity={fieldOp} />
            <Stop offset="1" stopColor={rank.c2} stopOpacity={fieldOp} />
          </SvgLG>
          <SvgRG id={sid} cx="0.4" cy="0.3" rx="0.5" ry="0.5">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={specOp} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </SvgRG>
        </Defs>

        {band === "radiant" && !dim && (
          <Circle cx="50" cy="50" r={44} fill="none" stroke={rank.glow} strokeWidth={0.6} strokeDasharray="2,3" opacity={0.55} />
        )}

        {/* Outer ring */}
        {band === "hex" && (
          <Polygon points="50,4 88,26 88,74 50,96 12,74 12,26" fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinejoin="round" />
        )}
        {band === "shield" && (
          <Path d="M14 14 L86 14 L86 56 Q86 80 50 96 Q14 80 14 56 Z" fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinejoin="round" />
        )}
        {band === "sunburst" && (
          <Path
            d="M50 4 L56 30 L80 14 L68 36 L94 42 L72 50 L94 58 L68 64 L80 86 L56 70 L50 96 L44 70 L20 86 L32 64 L6 58 L28 50 L6 42 L32 36 L20 14 L44 30 Z"
            fill="none"
            stroke={ringColor}
            strokeWidth={ringStroke}
            strokeLinejoin="round"
          />
        )}
        {band === "radiant" && (
          <Path
            d="M50 2 L57 22 L77 10 L70 32 L92 26 L80 46 L98 50 L80 54 L92 74 L70 68 L77 90 L57 78 L50 98 L43 78 L23 90 L30 68 L8 74 L20 54 L2 50 L20 46 L8 26 L30 32 L23 10 L43 22 Z"
            fill="none"
            stroke={ringColor}
            strokeWidth={ringStroke}
            strokeLinejoin="round"
          />
        )}

        {/* Field */}
        {band === "hex" && <Polygon points="50,12 80,28 80,72 50,88 20,72 20,28" fill={`url(#${fid})`} />}
        {band === "shield" && <Path d="M22 22 L78 22 L78 56 Q78 76 50 88 Q22 76 22 56 Z" fill={`url(#${fid})`} />}
        {band === "sunburst" && <Circle cx="50" cy="50" r={28} fill={`url(#${fid})`} />}
        {band === "radiant" && <Circle cx="50" cy="50" r={26} fill={`url(#${fid})`} />}

        {/* Specular */}
        <Ellipse cx="42" cy="34" rx="22" ry="14" fill={`url(#${sid})`} />

        {/* Bezel */}
        {band === "hex" && (
          <Polygon points="50,15 78,29 78,71 50,85 22,71 22,29" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} strokeLinejoin="round" />
        )}
        {band === "shield" && (
          <Path d="M25 24 L75 24 L75 56 Q75 74 50 85 Q25 74 25 56 Z" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} strokeLinejoin="round" />
        )}
        {band === "sunburst" && <Circle cx="50" cy="50" r={26} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} />}
        {band === "radiant" && <Circle cx="50" cy="50" r={24} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} />}

        {/* Glyph */}
        <G fill={glyphFill}>
          <GlyphFor name={rank.name} />
        </G>
      </Svg>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Reward registry — perks unlocked at each tier.
   ──────────────────────────────────────────────────────────────────────── */
export type RewardIcon = "check" | "snowflake" | "sparkle" | "user" | "send" | "shield" | "gift" | "compass" | "flag" | "crown";
export const TIER_REWARDS: Record<string, { icon: RewardIcon; text: string }> = {
  Iron: { icon: "check", text: "Honest logging unlocked" },
  Bronze: { icon: "snowflake", text: "+1 streak freeze / week" },
  Silver: { icon: "sparkle", text: "Coach insights on dashboard" },
  Gold: { icon: "user", text: "Custom profile icons · 50% off Shop" },
  Emerald: { icon: "send", text: "Post to feed · advanced sections" },
  Platinum: { icon: "shield", text: "+2 freezes · daily Coach tips" },
  Diamond: { icon: "gift", text: "Send gifts to friends · rank crown" },
  Master: { icon: "compass", text: "Mentor mode · help newer members" },
  Grandmaster: { icon: "flag", text: "Founder badge · early features" },
  Legend: { icon: "crown", text: "All cosmetics · forever free Shop" },
};

export function RewardIconSvg({ name, color }: { name: RewardIcon; color: string }) {
  const props = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "check":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M5 12l5 5L19 7" {...props} />
        </Svg>
      );
    case "snowflake":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" {...props} />
        </Svg>
      );
    case "sparkle":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" {...props} />
        </Svg>
      );
    case "user":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Circle cx="12" cy="8" r={4} {...props} />
          <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" {...props} />
        </Svg>
      );
    case "send":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" {...props} />
        </Svg>
      );
    case "shield":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 3l8 3v5c0 5-3 9-8 11-5-2-8-6-8-11V6z" {...props} />
        </Svg>
      );
    case "gift":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M3 8h18v13H3zM12 8v13M3 12h18M7 8a3 3 0 1 1 5-2 3 3 0 1 1 5 2" {...props} />
        </Svg>
      );
    case "compass":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r={9} {...props} />
          <Path d="M16 8l-3 7-5 1 3-7z" {...props} />
        </Svg>
      );
    case "flag":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M4 22V4l14 4-14 6" {...props} />
        </Svg>
      );
    case "crown":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M3 8l4 5 5-7 5 7 4-5-2 13H5z" {...props} />
        </Svg>
      );
  }
}
