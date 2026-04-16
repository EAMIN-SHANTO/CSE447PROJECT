const statusClassMap = {
  Encrypted: "bg-blue-100 text-blue-700",
  Verified: "bg-emerald-100 text-emerald-700",
  Locked: "bg-amber-100 text-amber-700",
  "Tamper Alert": "bg-rose-100 text-rose-700",
};

const CryptoStatusBadge = ({ label }) => {
  const className = statusClassMap[label] || "bg-slate-100 text-slate-700";

  return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${className}`}>{label}</span>;
};

export default CryptoStatusBadge;
