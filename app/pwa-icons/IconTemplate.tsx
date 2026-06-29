type PwaIconProps = {
  size: number;
};

export function PwaIcon({ size }: PwaIconProps) {
  const circleSize = Math.round(size * 0.62);
  const circleTop = Math.round(size * 0.1);
  const circleBorder = Math.max(5, Math.round(size * 0.022));
  const letterSize = Math.round(size * 0.34);
  const underlineWidth = Math.round(size * 0.22);
  const underlineHeight = Math.max(5, Math.round(size * 0.02));
  const underlineOffset = Math.round(size * 0.08);
  const labelTop = Math.round(size * 0.76);
  const labelSize = Math.max(18, Math.round(size * 0.085));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: circleTop,
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          border: `${circleBorder}px solid #1f1f1f`,
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: circleTop,
          width: circleSize,
          height: circleSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: letterSize,
          fontWeight: 900,
          color: "#1f1f1f",
          letterSpacing: "-0.06em",
        }}
      >
        <span
          style={{
            lineHeight: 0.9,
            transform: "translateY(-8%)",
          }}
        >
          A
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          width: underlineWidth,
          height: underlineHeight,
          top: circleTop + Math.round(circleSize / 2) + underlineOffset,
          borderRadius: 999,
          background: "#1f1f1f",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: labelTop,
          width: "100%",
          textAlign: "center",
          color: "#1f1f1f",
          fontSize: labelSize,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        AlignEDU
      </div>
    </div>
  );
}
