"use client";

import { ghost } from "../_components/ui";

export type Row = { rank: number; name: string; points: number; medals: string[] };

// Draws the board on a canvas and shares it as a PNG (share sheet on phones, download elsewhere).
export function ExportButton({ title, household, rows }: { title: string; household: string; rows: Row[] }) {
  async function share() {
    const W = 1080, rowH = 120, top = 260;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = top + Math.max(rows.length, 1) * rowH + 80;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#fff";
    c.fillRect(0, 0, W, canvas.height);
    c.fillStyle = "#18181b";
    c.font = "bold 64px system-ui, sans-serif";
    c.fillText(household, 60, 110, W - 120);
    c.font = "40px system-ui, sans-serif";
    c.fillStyle = "#52525b";
    c.fillText(`Leaderboard · ${title}`, 60, 180, W - 120);
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      c.fillStyle = "#18181b";
      c.font = "bold 48px system-ui, sans-serif";
      c.fillText(`${r.rank}.  ${r.name}`, 60, y + 50, 620);
      c.textAlign = "right";
      c.fillText(`${r.points} pts`, W - 60, y + 50);
      c.textAlign = "left";
      if (r.medals.length) {
        c.fillStyle = "#71717a";
        c.font = "30px system-ui, sans-serif";
        c.fillText(r.medals.join("  ·  "), 60 + 56, y + 94, W - 180);
      }
    });
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return;
    const file = new File([blob], `leaderboard-${title.toLowerCase().replace(/\W+/g, "-")}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${household} leaderboard` });
        return;
      } catch {
        return; // the person closed the share sheet
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return <button type="button" onClick={share} className={ghost}>Share as image</button>;
}
