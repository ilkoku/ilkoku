type ProgressBarProps = {
  value: number;
  max?: number;
  label: string;
};

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  return (
    <div className="progress" aria-label={label}>
      <progress className="progress__bar" value={value} max={max}>{value}%</progress>
      <span className="sr-only">{value} / {max}</span>
    </div>
  );
}
