type PwaIconProps = {
  size: number;
};

export function PwaIcon({ size }: PwaIconProps) {
  const titleSize = Math.round(size * 0.18);
  const subtitleSize = Math.round(size * 0.078);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: Math.round(size * 0.11),
        background:
          "linear-gradient(160deg, #0f172a 0%, #0b1220 44%, #1d4ed8 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: Math.round(size * 0.06),
          borderRadius: Math.round(size * 0.22),
          border: `${Math.max(2, Math.round(size * 0.014))}px solid rgba(125, 211, 252, 0.16)`,
          display: "flex",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: Math.round(size * 0.018),
          }}
        >
          <span
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: "-0.06em",
              lineHeight: 0.95,
            }}
          >
            Align
          </span>
          <span
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: "-0.06em",
              lineHeight: 0.95,
            }}
          >
            EDU
          </span>
        </div>
        <div
          style={{
            width: Math.round(size * 0.16),
            height: Math.round(size * 0.16),
            borderRadius: Math.round(size * 0.05),
            background: "linear-gradient(180deg, #fb923c 0%, #f97316 100%)",
            boxShadow: `0 ${Math.round(size * 0.03)}px ${Math.round(size * 0.07)}px rgba(249, 115, 22, 0.35)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.085),
          }}
        >
          ✓
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(size * 0.02),
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: Math.round(size * 0.028),
            alignItems: "flex-end",
          }}
        >
          {[0.78, 0.56, 0.9].map((height, index) => (
            <div
              key={index}
              style={{
                width: Math.round(size * 0.08),
                height: Math.round(size * height * 0.24),
                borderRadius: Math.round(size * 0.02),
                background:
                  index === 2
                    ? "linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)"
                    : "rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: subtitleSize,
            color: "rgba(226, 232, 240, 0.92)",
            lineHeight: 1.25,
          }}
        >
          Instructional visibility
        </span>
      </div>
    </div>
  );
}
