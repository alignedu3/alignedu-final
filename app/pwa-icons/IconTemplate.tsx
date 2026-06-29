type PwaIconProps = {
  size: number;
};

export function PwaIcon({ size }: PwaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AlignEDU app icon"
    >
      <rect width="1024" height="1024" fill="#ffffff" />
      <g transform="translate(0, 12)">
        <circle
          cx="512"
          cy="356"
          r="268"
          fill="none"
          stroke="#1f1f1f"
          strokeWidth="22"
        />
        <path
          d="M512 160
             L648 520
             H575
             L543 430
             H481
             L449 520
             H376
             Z
             M497 364
             H527
             L512 320
             Z"
          fill="#1f1f1f"
        />
        <rect
          x="350"
          y="582"
          width="324"
          height="20"
          rx="10"
          fill="#1f1f1f"
        />
      </g>
      <text
        x="512"
        y="902"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="78"
        fontWeight="700"
        letterSpacing="-2"
        fill="#1f1f1f"
      >
        AlignEDU.net
      </text>
    </svg>
  );
}
