// Re-mounts on every navigation, so each page fades in. Opacity only: a transform here would trap the fixed dock.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fade-in flex flex-1 flex-col">{children}</div>;
}
