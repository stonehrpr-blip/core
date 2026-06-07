/** Coach-feature accent. CORE uses electric blue (per project palette). */
export const ACCENT = "#4A8FFF";
export const ACCENT_DEEP = "#1856B8";
export const ACCENT_SOFT = "rgba(74,143,255,0.16)";

export function clockLabel(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}
