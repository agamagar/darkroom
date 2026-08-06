/**
 * Dark Room tokens. Deliberately minimal — the real values come from the
 * Away design system once the Figma component is readable. Nothing in a
 * specimen should hardcode a colour or a spacing past this file.
 */
export const theme = {
  color: {
    bg: '#0B1220',
    surface: '#141C2B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9AA6B8',
    textTertiary: '#5F6B7E',
    accent: '#3B82F6',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 999,
  },
} as const;
