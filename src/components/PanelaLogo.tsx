export function PanelaLogo({ size = 28, hideText }: { size?: number; hideText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/icon.png"
        alt="PANELA"
        className="rounded-md shadow-[0_0_18px_-4px_oklch(0.688_0.22_0.5_/_0.7)]"
        style={{ width: size, height: size, objectFit: "cover" }}
      />
      {!hideText && (
        <span
          className="font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)", fontSize: size * 0.7 }}
        >
          PANELA
        </span>
      )}
    </div>
  );
}
