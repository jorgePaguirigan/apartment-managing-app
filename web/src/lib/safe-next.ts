// Only allow same-site relative redirects after sign-in.
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
