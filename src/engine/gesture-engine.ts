// Core gesture detection engine
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureConfig {
  pinch: {
    ratio_enter_frontal: number;
    ratio_enter_profile: number;
    ema_rate: number;
    birth_speed_guard: number;
    release_bar_slow: number;
    release_bar_fast: number;
  };
  claw: {
    gap_floor_enter: number;
    gap_floor_hold: number;
    c8_enter: number;
    c12_enter: number;
    c16_enter: number;
    aspect_min_enter: number;
  };
  clap: {
    distance_threshold: number;
    cooldown_ms: number;
  };
  fling: {
    speed_bar_pxs: number;
    peak_ratio_minimum: number;
    minimum_grip_ms: number;
  };
  hold_rotate: {
    duration_ms: number;
    drift_px: number;
  };
}

export const landmarkUtils = {
  seg: (lm: Landmark[], a: number, b: number) => {
    const dx = lm[a].x - lm[b].x;
    const dy = lm[a].y - lm[b].y;
    const dz = lm[a].z - lm[b].z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  curl: (lm: Landmark[], tip: number, pip: number, mcp: number) => {
    const tipToMcp = landmarkUtils.seg(lm, tip, mcp);
    const pipToMcp = landmarkUtils.seg(lm, pip, mcp);
    return pipToMcp > 0 ? tipToMcp / pipToMcp : 1;
  },

  palmW: (lm: Landmark[]) => landmarkUtils.seg(lm, 0, 5),

  tipGap: (lm: Landmark[], a: number, b: number) => landmarkUtils.seg(lm, a, b),

  hookR: (lm: Landmark[], tip: number) => {
    const palmCenter = {
      x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
      y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
    };
    const dx = lm[tip].x - palmCenter.x;
    const dy = lm[tip].y - palmCenter.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  aspect: (lm: Landmark[]) => {
    const xs = lm.map(l => l.x);
    const ys = lm.map(l => l.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return h > 0 ? w / h : 1;
  },

  extFingers: (lm: Landmark[]) => {
    let count = 0;
    if (landmarkUtils.seg(lm, 4, 0) > landmarkUtils.seg(lm, 3, 0)) count++;
    if (landmarkUtils.seg(lm, 8, 0) > landmarkUtils.seg(lm, 6, 0)) count++;
    if (landmarkUtils.seg(lm, 12, 0) > landmarkUtils.seg(lm, 10, 0)) count++;
    if (landmarkUtils.seg(lm, 16, 0) > landmarkUtils.seg(lm, 14, 0)) count++;
    if (landmarkUtils.seg(lm, 20, 0) > landmarkUtils.seg(lm, 18, 0)) count++;
    return count;
  },
};

export function toScreen(
  landmark: Landmark,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean = true
): { x: number; y: number } {
  return {
    x: (mirror ? 1 - landmark.x : landmark.x) * canvasWidth,
    y: landmark.y * canvasHeight,
  };
}
