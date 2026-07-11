"use client";

type Props = {
  src?: string | null;
  label: string;
  size?: number;
  radius?: number | string;
  background?: string;
  color?: string;
  fontSize?: number;
  style?: React.CSSProperties;
};

function initialsFromLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default function AvatarImage({
  src,
  label,
  size = 40,
  radius = "50%",
  background = "#111827",
  color = "#ffffff",
  fontSize,
  style,
}: Props) {
  const initials = initialsFromLabel(label);
  const computedFontSize = fontSize ?? Math.max(10, Math.round(size * 0.34));

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "cover",
          flexShrink: 0,
          display: "block",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: computedFontSize,
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
