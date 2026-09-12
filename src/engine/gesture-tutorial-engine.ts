// gesture-tutorial-engine.ts — Slow-motion gesture animation and verification system

export interface GestureKeyframe {
  timestamp: number; // ms from start
  landmarks: { x: number; y: number; z: number }[];
  isKeyPoint: boolean; // Pause here during playback
  label?: string; // Description of this key point
}

export interface GestureTutorial {
  id: string;
  name: string;
  description: string;
  keyframes: GestureKeyframe[];
  goodExample: GestureKeyframe[]; // For comparison
  badExample: GestureKeyframe[]; // Common mistakes
  successThreshold: number; // 0-1 similarity score needed
  requiredAttempts: number; // Usually 3
}

export interface TutorialPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrameIndex: number;
  currentTime: number;
  speed: number; // 0.1 = slow motion, 1.0 = normal
  isShowingBadExample: boolean;
}

export interface VerificationState {
  attempts: number;
  successes: number;
  isVerifying: boolean;
  lastScore: number;
  isUnlocked: boolean;
  feedback: 'none' | 'success' | 'failure' | 'in-progress';
}

// Generate keyframes for built-in gestures
export function generateGestureKeyframes(gestureType: string): GestureTutorial {
  const baseKeyframes = createBaseKeyframes(gestureType);
  
  return {
    id: `tutorial-${gestureType}`,
    name: gestureType.toUpperCase(),
    description: getGestureDescription(gestureType),
    keyframes: baseKeyframes,
    goodExample: baseKeyframes,
    badExample: createBadExample(gestureType),
    successThreshold: 0.75,
    requiredAttempts: 3,
  };
}

function createBaseKeyframes(gestureType: string): GestureKeyframe[] {
  switch (gestureType) {
    case 'pinch':
      return [
        {
          timestamp: 0,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Start: Open hand',
        },
        {
          timestamp: 1000,
          landmarks: createApproachingPinchLandmarks(0.3),
          isKeyPoint: false,
        },
        {
          timestamp: 2000,
          landmarks: createApproachingPinchLandmarks(0.6),
          isKeyPoint: true,
          label: 'Midway: Fingers approaching',
        },
        {
          timestamp: 3000,
          landmarks: createPinchLandmarks(0.9),
          isKeyPoint: true,
          label: 'Pinch: Thumb and index touch',
        },
        {
          timestamp: 4000,
          landmarks: createPinchLandmarks(1.0),
          isKeyPoint: true,
          label: 'Hold: Maintain pinch',
        },
      ];
    
    case 'claw':
      return [
        {
          timestamp: 0,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Start: Open hand',
        },
        {
          timestamp: 1500,
          landmarks: createPartialCurlLandmarks(0.4),
          isKeyPoint: false,
        },
        {
          timestamp: 3000,
          landmarks: createPartialCurlLandmarks(0.7),
          isKeyPoint: true,
          label: 'Midway: Fingers curling',
        },
        {
          timestamp: 4500,
          landmarks: createClawLandmarks(),
          isKeyPoint: true,
          label: 'Claw: Fingers fully curled',
        },
      ];
    
    case 'palm':
      return [
        {
          timestamp: 0,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Start: Open palm',
        },
        {
          timestamp: 2000,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Hold: Keep palm open',
        },
      ];
    
    default:
      return [
        {
          timestamp: 0,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Start',
        },
      ];
  }
}

function createBadExample(gestureType: string): GestureKeyframe[] {
  // Common mistakes for each gesture
  switch (gestureType) {
    case 'pinch':
      return [
        {
          timestamp: 0,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Mistake: Too fast',
        },
        {
          timestamp: 500,
          landmarks: createPinchLandmarks(1.0),
          isKeyPoint: true,
          label: 'Mistake: No gradual approach',
        },
      ];
    
    case 'claw':
      return [
        {
          timestamp: 0,
          landmarks: createOpenHandLandmarks(),
          isKeyPoint: true,
          label: 'Mistake: Only some fingers',
        },
        {
          timestamp: 2000,
          landmarks: createPartialCurlLandmarks(0.5),
          isKeyPoint: true,
          label: 'Mistake: Incomplete curl',
        },
      ];
    
    default:
      return createBaseKeyframes(gestureType);
  }
}

// Landmark generation helpers
function createOpenHandLandmarks(): { x: number; y: number; z: number }[] {
  // 21 landmarks for open hand
  const base = { x: 0.5, y: 0.5, z: 0 };
  return [
    base, // 0: Wrist
    { x: 0.42, y: 0.55, z: 0.02 }, // 1: Thumb CMC
    { x: 0.38, y: 0.50, z: 0.03 }, // 2: Thumb MCP
    { x: 0.35, y: 0.45, z: 0.02 }, // 3: Thumb IP
    { x: 0.33, y: 0.40, z: 0.01 }, // 4: Thumb tip
    { x: 0.45, y: 0.45, z: 0 }, // 5: Index MCP
    { x: 0.44, y: 0.38, z: -0.01 }, // 6: Index PIP
    { x: 0.43, y: 0.32, z: -0.02 }, // 7: Index DIP
    { x: 0.42, y: 0.26, z: -0.01 }, // 8: Index tip
    { x: 0.50, y: 0.43, z: 0 }, // 9: Middle MCP
    { x: 0.50, y: 0.36, z: -0.01 }, // 10: Middle PIP
    { x: 0.50, y: 0.29, z: -0.02 }, // 11: Middle DIP
    { x: 0.50, y: 0.22, z: -0.01 }, // 12: Middle tip
    { x: 0.55, y: 0.45, z: 0 }, // 13: Ring MCP
    { x: 0.56, y: 0.38, z: -0.01 }, // 14: Ring PIP
    { x: 0.57, y: 0.32, z: -0.02 }, // 15: Ring DIP
    { x: 0.58, y: 0.26, z: -0.01 }, // 16: Ring tip
    { x: 0.60, y: 0.48, z: 0.01 }, // 17: Pinky MCP
    { x: 0.62, y: 0.42, z: 0 }, // 18: Pinky PIP
    { x: 0.64, y: 0.37, z: -0.01 }, // 19: Pinky DIP
    { x: 0.66, y: 0.32, z: 0 }, // 20: Pinky tip
  ];
}

function createApproachingPinchLandmarks(progress: number): { x: number; y: number; z: number }[] {
  const open = createOpenHandLandmarks();
  const pinched = createPinchLandmarks(1.0);
  
  return open.map((lm, i) => ({
    x: lm.x + (pinched[i].x - lm.x) * progress,
    y: lm.y + (pinched[i].y - lm.y) * progress,
    z: lm.z + (pinched[i].z - lm.z) * progress,
  }));
}

function createPinchLandmarks(closeness: number): { x: number; y: number; z: number }[] {
  const open = createOpenHandLandmarks();
  const pinchPoint = { x: 0.38, y: 0.40, z: 0.01 };
  
  // Move thumb tip (4) and index tip (8) toward pinch point
  const result = [...open];
  result[4] = {
    x: open[4].x + (pinchPoint.x - open[4].x) * closeness,
    y: open[4].y + (pinchPoint.y - open[4].y) * closeness,
    z: open[4].z + (pinchPoint.z - open[4].z) * closeness,
  };
  result[8] = {
    x: open[8].x + (pinchPoint.x - open[8].x) * closeness,
    y: open[8].y + (pinchPoint.y - open[8].y) * closeness,
    z: open[8].z + (pinchPoint.z - open[8].z) * closeness,
  };
  
  return result;
}

function createPartialCurlLandmarks(curlAmount: number): { x: number; y: number; z: number }[] {
  const open = createOpenHandLandmarks();
  const claw = createClawLandmarks();
  
  return open.map((lm, i) => ({
    x: lm.x + (claw[i].x - lm.x) * curlAmount,
    y: lm.y + (claw[i].y - lm.y) * curlAmount,
    z: lm.z + (claw[i].z - lm.z) * curlAmount,
  }));
}

function createClawLandmarks(): { x: number; y: number; z: number }[] {
  const open = createOpenHandLandmarks();
  const palmCenter = { x: 0.50, y: 0.50, z: 0 };
  
  // Curl fingers toward palm
  return open.map((lm, i) => {
    // Don't move wrist or MCPs much
    if (i === 0 || [5, 9, 13, 17].includes(i)) return lm;
    
    // Move tips and IPs toward palm
    const curlFactor = [4, 8, 12, 16, 20].includes(i) ? 0.7 : 0.5;
    return {
      x: lm.x + (palmCenter.x - lm.x) * curlFactor,
      y: lm.y + (palmCenter.y - lm.y) * curlFactor,
      z: lm.z + (palmCenter.z - lm.z) * curlFactor,
    };
  });
}

function getGestureDescription(gestureType: string): string {
  const descriptions: Record<string, string> = {
    pinch: 'Bring thumb and index finger together slowly, then hold',
    claw: 'Curl all fingers toward palm in a claw shape',
    palm: 'Keep hand open with all fingers extended',
    wave: 'Move hand side to side with open palm',
    fist: 'Curl all fingers into a tight fist',
  };
  return descriptions[gestureType] || 'Perform the gesture as shown';
}

// Interpolate between keyframes
export function interpolateKeyframes(
  frame1: GestureKeyframe,
  frame2: GestureKeyframe,
  progress: number // 0-1
): { x: number; y: number; z: number }[] {
  return frame1.landmarks.map((lm, i) => ({
    x: lm.x + (frame2.landmarks[i].x - lm.x) * progress,
    y: lm.y + (frame2.landmarks[i].y - lm.y) * progress,
    z: lm.z + (frame2.landmarks[i].z - lm.z) * progress,
  }));
}

// Calculate similarity between two gestures (0-1)
export function calculateGestureSimilarity(
  gesture1: { x: number; y: number; z: number }[],
  gesture2: { x: number; y: number; z: number }[]
): number {
  if (gesture1.length !== gesture2.length) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < gesture1.length; i++) {
    const dx = gesture1[i].x - gesture2[i].x;
    const dy = gesture1[i].y - gesture2[i].y;
    const dz = gesture1[i].z - gesture2[i].z;
    totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  const avgDistance = totalDistance / gesture1.length;
  // Convert distance to similarity (closer = higher similarity)
  return Math.max(0, 1 - avgDistance * 5);
}
