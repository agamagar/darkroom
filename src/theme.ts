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

    /** Figma variable `primary/950` — the pill's base fill. */
    primary950: '#0F0620',
    /** The inner-glow purple; not yet a Figma variable, raw hex in the design. */
    glow: '#6D5CF0',
    /** Tail colour of the label's gradient. */
    labelGradientEnd: '#8375E5',
    hairline: 'rgba(82, 82, 94, 0.2)',

    /** Figma variable `indigo/400` — the bench picker's selection colour. */
    indigo400: '#8B7CF6',
    /** Figma variable `indigo/500`. Same value as `glow`. */
    indigo500: '#6D5CF0',
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
  /**
   * The design's families, bundled in src/assets/fonts. Google Sans Flex is
   * instanced static (wght 300/400, wdth 100, GRAD 0, ROND 0) because RN
   * cannot drive variable-font axes; Stack Sans Headline is OFL, from the
   * Stack Sans Project repo.
   */
  font: {
    // Google Sans Flex is Google-proprietary and cannot ship in a public
    // repo; undefined falls back to the platform font. Drop the instanced
    // TTFs into src/assets/fonts and restore the names for full fidelity.
    flexLight: undefined as string | undefined,
    flexRegular: undefined as string | undefined,
    headlineLight: 'StackSansHeadline-Light',
  },
} as const;
