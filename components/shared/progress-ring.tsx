"use client";

interface ProgressRingProps {
  completed: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  completed,
  total = 8,
  size = 36,
  strokeWidth = 3.5,
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, completed / total));
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={`${completed} of ${total} daily puzzle editions solved today`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
          fill="none"
        />
        {/* Animated Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-brand transition-all duration-500 ease-out"
          fill="none"
        />
      </svg>
      {/* Inner Label */}
      <span className="absolute font-mono text-[10px] font-black text-slate-700">
        {completed}
      </span>
    </div>
  );
}
