import { GestureConfig } from './gesture-engine';

export const DEFAULT_THRESHOLDS: GestureConfig = {
  pinch: {
    ratio_enter_frontal: 0.32,
    ratio_enter_profile: 0.38,
    ema_rate: 0.30,
    birth_speed_guard: 900,
    release_bar_slow: 0.55,
    release_bar_fast: 0.70,
  },
  claw: {
    gap_floor_enter: 0.80,
    gap_floor_hold: 0.68,
    c8_enter: 0.6,
    c12_enter: 0.35,
    c16_enter: 0.55,
    aspect_min_enter: 1.05,
  },
  clap: {
    distance_threshold: 0.15,
    cooldown_ms: 800,
  },
  fling: {
    speed_bar_pxs: 1300,
    peak_ratio_minimum: 0.40,
    minimum_grip_ms: 120,
  },
  hold_rotate: {
    duration_ms: 1000,
    drift_px: 80,
  },
};

export interface GestureDefinition {
  id: string;
  name: string;
  description: string;
  hand: 'left' | 'right' | 'both';
  type: 'pinch' | 'claw' | 'clap' | 'fling' | 'hold' | 'stretch' | 'scrub' | 'palm' | 'custom';
  action: string;
  thresholds: Partial<GestureConfig>;
  successRate: number;
  createdAt: string;
  isBuiltIn: boolean;
}

export const BUILT_IN_GESTURES: GestureDefinition[] = [
  {
    id: 'pinch-tap',
    name: 'PINCH-TAP',
    description: 'Open/close pinch to select and activate elements',
    hand: 'right',
    type: 'pinch',
    action: 'select',
    thresholds: { pinch: DEFAULT_THRESHOLDS.pinch },
    successRate: 0.94,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'pinch-drag',
    name: 'PINCH-DRAG',
    description: 'Pinch and move to drag cards and objects',
    hand: 'right',
    type: 'pinch',
    action: 'drag',
    thresholds: { pinch: DEFAULT_THRESHOLDS.pinch },
    successRate: 0.91,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'hold-rotate',
    name: 'HOLD-STILL → ROTATE',
    description: 'Hold pinch still to enter rotation mode',
    hand: 'right',
    type: 'hold',
    action: 'rotate',
    thresholds: { hold_rotate: DEFAULT_THRESHOLDS.hold_rotate },
    successRate: 0.87,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'two-hand-stretch',
    name: 'TWO-HAND STRETCH',
    description: 'Pull hands apart to zoom/stretch content',
    hand: 'both',
    type: 'stretch',
    action: 'zoom',
    thresholds: {},
    successRate: 0.89,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'fling-throw',
    name: 'FLING/THROW',
    description: 'Fast pinch release to fling objects with momentum',
    hand: 'right',
    type: 'fling',
    action: 'fling',
    thresholds: { fling: DEFAULT_THRESHOLDS.fling },
    successRate: 0.82,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'clap',
    name: 'CLAP',
    description: 'Bring both hands together to trigger action',
    hand: 'both',
    type: 'clap',
    action: 'clear',
    thresholds: { clap: DEFAULT_THRESHOLDS.clap },
    successRate: 0.93,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'claw',
    name: 'CLAW',
    description: 'Curl fingers into claw to force-pull targets',
    hand: 'right',
    type: 'claw',
    action: 'force_pull',
    thresholds: { claw: DEFAULT_THRESHOLDS.claw },
    successRate: 0.78,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'empty-pinch-scrub',
    name: 'EMPTY-PINCH SCRUB',
    description: 'Sideways drag on empty pinch to scrub timeline',
    hand: 'right',
    type: 'scrub',
    action: 'scroll_note',
    thresholds: { pinch: DEFAULT_THRESHOLDS.pinch },
    successRate: 0.85,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'palm-open',
    name: 'PALM-OPEN',
    description: 'Open palm to present/hover over content',
    hand: 'right',
    type: 'palm',
    action: 'present',
    thresholds: {},
    successRate: 0.96,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
  {
    id: 'wrist-snap',
    name: 'WRIST-SNAP',
    description: 'Quick wrist flick gesture (reserved for custom binding)',
    hand: 'right',
    type: 'custom',
    action: 'widget',
    thresholds: {},
    successRate: 0.0,
    createdAt: '2024-01-01T00:00:00Z',
    isBuiltIn: true,
  },
];

export const BONE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm
];
