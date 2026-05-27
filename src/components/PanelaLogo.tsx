export function PanelaLogo({ size = 28, hideText }: { size?: number; hideText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid place-items-center rounded-md bg-primary text-primary-foreground font-bold shadow-[0_0_18px_-4px_oklch(0.755_0.18_45_/_0.7)]"
        style={{ width: size, height: size, fontFamily: "var(--font-display)" }}
      >
        P
      </div>
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
