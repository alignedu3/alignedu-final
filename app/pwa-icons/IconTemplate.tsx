type PwaIconProps = {
  size: number;
};

export function PwaIcon({ size }: PwaIconProps) {
  const shellPadding = Math.round(size * 0.08);
  const circleSize = Math.round(size * 0.66);
  const circleBorder = Math.max(5, Math.round(size * 0.022));
  const letterSize = Math.round(circleSize * 0.58);
  const underlineWidth = Math.round(circleSize * 0.42);
  const underlineHeight = Math.max(5, Math.round(size * 0.02));
  const labelSize = Math.max(16, Math.round(size * 0.064));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${shellPadding}px ${Math.round(size * 0.06)}px ${Math.round(size * 0.09)}px`,
        boxSizing: "border-box",
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          border: `${circleBorder}px solid #1f1f1f`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
          <span
            style={{
              fontSize: letterSize,
              fontWeight: 900,
              color: "#1f1f1f",
              letterSpacing: "-0.06em",
              lineHeight: 0.88,
              transform: "translateY(-10%)",
            }}
          >
            A
          </span>
          <div
            style={{
              position: "absolute",
              width: underlineWidth,
              height: underlineHeight,
              bottom: Math.round(circleSize * 0.18),
              left: "50%",
              transform: "translateX(-50%)",
              borderRadius: 999,
              background: "#1f1f1f",
            }}
          />
        </div>
      </div>

      <div
        style={{
          width: "100%",
          flexShrink: 0,
          textAlign: "center",
          color: "#1f1f1f",
          fontSize: labelSize,
          fontWeight: 700,
          letterSpacing: "-0.035em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        AlignEDU.net
      </div>
    </div>
  );
}
