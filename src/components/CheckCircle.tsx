interface CheckCircleProps {
  done: boolean;
  onClick?: () => void;
  size?: number;
  showCount?: number;
}

export function CheckCircle({ done, onClick, showCount }: CheckCircleProps) {
  return (
    <button
      className={`check-circle ${done ? "check-circle-done" : ""}`}
      onClick={onClick}
    >
      {done ? (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : showCount !== undefined ? (
        <span className="text-[9px] text-muted-foreground">{showCount}</span>
      ) : null}
    </button>
  );
}
