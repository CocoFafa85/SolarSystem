// Source unique des breakpoints — alignée avec tokens.css.
// Toute lecture JS de breakpoint passe par ce module.

export const BREAKPOINTS = Object.freeze({
  sm: 0,
  md: 768,
  lg: 1024,
  xl: 1440,
});

export function currentBreakpoint(width = window.innerWidth) {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

export function isMobile(width = window.innerWidth) {
  return width < BREAKPOINTS.md;
}
