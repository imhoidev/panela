export function PanelaLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid place-items-center rounded-md bg-primary text-primary-foreground font-bold"
        style={{ width: size, height: size, fontFamily: "var(--font-display)" }}
      >
        P
      </div>
      <span
        className="font-bold tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-display)", fontSize: size * 0.7 }}
      >
        PANELA
      </span>
    </div>
  );
}
