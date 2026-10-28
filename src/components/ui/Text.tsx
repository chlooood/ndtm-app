import { Text, type TextProps } from 'react-native';

// One type scale for the whole app: Newsreader for headings, DM Sans for
// everything you read or tap, DM Mono for dates, times and coordinates.
const VARIANTS = {
  display: 'font-display text-[32px] leading-[36px] text-ink',
  title: 'font-display text-[22px] leading-[27px] text-ink',
  heading: 'font-sans-semibold text-[17px] leading-[22px] text-ink',
  body: 'font-sans text-[15px] leading-[22px] text-ink',
  muted: 'font-sans text-[14px] leading-[20px] text-muted',
  small: 'font-sans text-[12px] leading-[17px] text-muted',
  label: 'font-sans-semibold text-[11px] uppercase tracking-[1.6px] text-muted',
  mono: 'font-mono text-[12px] leading-[16px] text-muted',
} as const;

export type TextVariant = keyof typeof VARIANTS;

export function T({ variant = 'body', className = '', ...props }: TextProps & { variant?: TextVariant; className?: string }) {
  return <Text {...props} className={`${VARIANTS[variant]} ${className}`} />;
}
