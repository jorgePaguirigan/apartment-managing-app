// Errors travel in the URL as short codes, never as free text, so a crafted link cannot show arbitrary words on the page.
const TEXT: Record<string, string> = {
  "not-signed-in": "Please sign in again.",
  "already-in-a-household": "You are already in a household.",
  "invite-not-found": "That invite link is invalid, expired or revoked.",
  "housemates-only": "Only housemates can do that.",
  "admin-only": "Only an admin can do that.",
  "deed-not-found": "That deed doesn't exist.",
  "deed-is-inactive": "That deed is hidden.",
  "only-good-deeds-can-be-claimed": "Penalties are entered by an admin.",
  "already-waiting-for-approval": "You already have that claim waiting for approval.",
  "claim-not-found": "That claim no longer exists.",
  "claim-already-decided": "That claim was already decided.",
  "target-must-be-a-housemate-in-this-household": "Pick a housemate in this household.",
  "entry-not-found": "That entry no longer exists.",
  "unknown-time-zone": "Pick a time zone from the list.",
  "invalid-title": "Describe the deed in 1 to 80 characters.",
  "points-must-be-positive": "Give a custom deed a whole number of points above 0.",
  "invalid-points": "Points must be a whole number other than 0.",
  "dibs-are-closed": "Dibs are closed. They are open Thursday to Saturday before the week.",
  "already-taken": "Someone else already took that chore.",
  "over-your-fair-share": "You already have your fair share of chores.",
  "chore-not-found": "That chore no longer exists.",
  "this-chore-can-no-longer-move": "That chore can no longer be moved.",
  "chore-has-no-deed-to-claim": "That chore has no deed to claim yet. Ask the admin to link one.",
  "week-has-not-started": "That week has not started yet.",
  "already-submitted": "You already submitted that chore.",
  "invalid-chore": "Give the chore a name, a weekday and a weight from 1 to 3.",
  "no-household": "You are not in a household.",
  "email-rate-limit-exceeded": "Too many sign-in emails. Wait a few minutes and try again.",
  "invalid-login-credentials": "Wrong email or password.",
  "user-already-registered": "That email already has an account. Sign in instead.",
  "weak-password": "Use a password with at least 8 characters.",
  "email-not-confirmed": "Confirm your email first, using the link we sent you.",
  "bad-link": "That sign-in link is invalid or expired.",
};

export const errorCode = (message: string) => {
  const code = message.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return code in TEXT ? code : "unknown";
};

export const errorText = (code?: string) =>
  code ? (TEXT[code] ?? "Something went wrong. Try again.") : undefined;
