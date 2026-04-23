function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const SIZE_MAP = {
  sm: {
    iconClassName: "h-6 w-5",
    textClassName: "text-lg",
    gapClassName: "gap-2",
  },
  md: {
    iconClassName: "h-8 w-7",
    textClassName: "text-2xl",
    gapClassName: "gap-2.5",
  },
  lg: {
    iconClassName: "h-10 w-8",
    textClassName: "text-3xl",
    gapClassName: "gap-3",
  },
};

export default function BrandLogo({
  size = "md",
  className = "",
  iconClassName = "",
  textClassName = "",
  hideText = false,
}) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <span
      className={cn(
        "inline-flex items-center",
        config.gapClassName,
        className
      )}
      aria-label="veklo"
    >
      <svg
        viewBox="0 0 84 100"
        className={cn(config.iconClassName, "shrink-0", iconClassName)}
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="vekloOrangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8C00" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="vekloAmberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
        <polygon
          points="30,18 54,50 30,82 6,50"
          fill="url(#vekloOrangeGradient)"
          opacity="0.95"
        />
        <polygon
          points="54,18 78,50 54,82 30,50"
          fill="url(#vekloAmberGradient)"
          opacity="0.75"
        />
      </svg>

      {!hideText && (
        <span
          className={cn(
            "font-bold lowercase leading-none tracking-[-0.04em] [font-family:var(--font-veklo-display)]",
            config.textClassName,
            textClassName
          )}
        >
          veklo
        </span>
      )}
    </span>
  );
}
