/**
 * Shared motion vocabulary.
 *
 * The house curve is easeOutQuint — things decelerate into place and settle,
 * which is what "calm" means in motion terms. Exits are always faster than
 * entrances: waiting for something to leave feels like lag.
 *
 * NEVER animate `backdrop-filter`. On Android WebView it forces a full-layer
 * repaint every frame and visibly stutters the glass header and nav.
 *
 * And one hard rule, learned the painful way in AlarmOverlay: an
 * <AnimatePresence> whose subtree contains an infinite (`repeat: Infinity`)
 * animation must NOT have an `exit` prop. The looping child prevents
 * exit-complete from firing, which strands an invisible full-screen layer
 * that silently blocks every tap.
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const T = {
  /** Colour, opacity, icon swaps. */
  micro: { duration: 0.15, ease: EASE_OUT },
  /** Cards and sheets appearing. */
  enter: { duration: 0.3, ease: EASE_OUT },
  /** Always quicker than `enter`. */
  exit: { duration: 0.18, ease: EASE_IN_OUT },
  tab: { duration: 0.2, ease: EASE_OUT },
} as const;

export const SPRING = {
  /** whileTap feedback. */
  press: { type: "spring", stiffness: 500, damping: 32, mass: 0.6 },
  /** Shared-layout movement, e.g. the nav pill. */
  pill: { type: "spring", stiffness: 380, damping: 34, mass: 0.8 },
} as const;

/** Card/list entrance. Subtle rise, no scale — scale reads as "bouncy". */
export const riseIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: T.enter,
} as const;

/**
 * Stagger a list from its container instead of hand-computing `delay` per
 * index. Hand-computed delays break the moment a list is filtered or
 * reordered — which the new history lists do.
 */
export const staggerParent = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
} as const;
