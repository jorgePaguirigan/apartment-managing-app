// Shown instantly while the next screen's server render finishes, so a tab switch never feels frozen.
export default function Loading() {
  return (
    <div aria-busy className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-24 sm:px-6">
      <div className="h-10 w-48 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-24 animate-pulse rounded-3xl bg-surface-2" />
      <div className="h-24 animate-pulse rounded-3xl bg-surface-2" />
    </div>
  );
}
