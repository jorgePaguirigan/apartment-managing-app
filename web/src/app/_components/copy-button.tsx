"use client";

import { useState } from "react";
import { Icon, ghost } from "./ui";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the link is on screen to copy by hand.
    }
  }
  return <button type="button" onClick={copy} aria-live="polite" className={ghost}><Icon name={copied ? "check" : "copy"} className="size-4" />{copied ? "Copied" : "Copy"}</button>;
}
