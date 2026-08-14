import { jsxs, jsx } from "react/jsx-runtime";
function PanelaLogo({ size = 28, hideText }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx(
      "img",
      {
        src: "/icon.png",
        alt: "PANELA",
        className: "rounded-md shadow-[0_0_18px_-4px_oklch(0.688_0.22_0.5_/_0.7)]",
        style: { width: size, height: size, objectFit: "cover" }
      }
    ),
    !hideText && /* @__PURE__ */ jsx(
      "span",
      {
        className: "font-bold tracking-tight text-foreground",
        style: { fontFamily: "var(--font-display)", fontSize: size * 0.7 },
        children: "PANELA"
      }
    )
  ] });
}
export {
  PanelaLogo as P
};
