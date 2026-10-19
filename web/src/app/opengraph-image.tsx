import { ImageResponse } from "next/og";

export const alt = "Kasangga: the household scoreboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share card: the paper background, the two-partner mark and the word, centered.
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, background: "#f2efe6", color: "#16171b" }}>
        <div style={{ display: "flex", width: 200, height: 200, borderRadius: 52, background: "#cbff41", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 104, height: 104, borderRadius: 52, background: "#16171b", marginRight: -26 }} />
          <div style={{ width: 104, height: 104, borderRadius: 52, background: "rgba(22,23,27,0.72)" }} />
        </div>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -6 }}>Kasangga</div>
        <div style={{ fontSize: 36, color: "#5c5a52" }}>Keep the house running, together.</div>
      </div>
    ),
    size,
  );
}
