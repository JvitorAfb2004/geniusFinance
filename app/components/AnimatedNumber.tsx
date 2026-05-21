import { formatCurrency } from '../lib/utils';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

type AnimatedNumberProps = {
  value: number;
  className?: string;
  kind?: 'currency' | 'number' | 'percent';
  duration?: number;
  decimals?: number;
};

export function AnimatedNumber({
  value,
  className,
  kind = 'currency',
  duration,
  decimals = kind === 'percent' ? 1 : 0,
}: AnimatedNumberProps) {
  const animatedValue = useAnimatedValue(value, duration);

  const formatted =
    kind === 'currency'
      ? formatCurrency(animatedValue)
      : kind === 'percent'
        ? `${animatedValue.toFixed(decimals)}%`
        : animatedValue.toFixed(decimals);

  return <span className={className}>{formatted}</span>;
}
