const PALETTES = [
  ["#2563eb", "#1d4ed8"],
  ["#0f766e", "#0f766e"],
  ["#7c3aed", "#6d28d9"],
  ["#db2777", "#be185d"],
  ["#ea580c", "#c2410c"],
  ["#0891b2", "#0e7490"],
  ["#16a34a", "#15803d"],
  ["#475569", "#334155"],
];

const SIZE_MAP = {
  xs: 22,
  sm: 30,
  md: 38,
  lg: 48,
  xl: 64,
};

const TEXT_SIZE_MAP = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const hashSeed = (input) => {
  const value = String(input || "user");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getInitials = (name) => {
  const value = String(name || "User").trim();
  const parts = value.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const UserAvatar = ({ name, size = "md", className = "" }) => {
  const safeSize = SIZE_MAP[size] ? size : "md";
  const hash = hashSeed(name);
  const palette = PALETTES[hash % PALETTES.length];
  const initials = getInitials(name);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-bold shadow-sm border border-white/70 ${TEXT_SIZE_MAP[safeSize]} ${className}`}
      style={{
        width: SIZE_MAP[safeSize],
        height: SIZE_MAP[safeSize],
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
      }}
      aria-label={`Avatar for ${name || "user"}`}
      title={name || "user"}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;
