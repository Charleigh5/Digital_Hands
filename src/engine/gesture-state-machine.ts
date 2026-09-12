// gesture-state-machine.ts — Finite state machine with temporal smoothing
// Provides intuitive gesture detection with hysteresis, prediction, and confidence scoring

export type GesturePhase = 'idle' | 'approaching' | 'active' | 'releasing' | 'cooldown';

export interface GestureState {
  phase: GesturePhase;
  confidence: number;        // 0-1, how close to triggering
  predictedTime: number;     // ms until predicted trigger
  velocity: number;          // current movement velocity
  stability: number;         // 0-1, how steady the hand is
  phaseStartTime: number;
  lastTransition: number;
}

export interface StateMachineConfig {
  enterThreshold: number;
  exitThreshold: number;
  approachZone: number;      // distance from threshold to start "approaching"
  cooldownMs: number;
  stabilityWindow: number;   // ms to measure stability
  predictionHorizon: number; // ms to look ahead
}

const DEFAULT_CONFIG: StateMachineConfig = {
  enterThreshold: 0.32,
  exitThreshold: 0.55,
  approachZone: 0.15,
  cooldownMs: 200,
  stabilityWindow: 300,
  predictionHorizon: 150,
};

export class GestureStateMachine {
  private config: StateMachineConfig;
  private state: GestureState;
  private valueHistory: Array<{ value: number; time: number }> = [];
  private velocityHistory: Array<{ velocity: number; time: number }> = [];
  
  constructor(config: Partial<StateMachineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      phase: 'idle',
      confidence: 0,
      predictedTime: Infinity,
      velocity: 0,
      stability: 1,
      phaseStartTime: Date.now(),
      lastTransition: Date.now(),
    };
  }

  // Update with current gesture value (e.g., pinch ratio)
  update(value: number, timestamp: number = Date.now()): GestureState {
    // Record history
    this.valueHistory.push({ value, time: timestamp });
    if (this.valueHistory.length > 60) {
      this.valueHistory.shift();
    }

    // Calculate velocity
    const velocity = this.calculateVelocity(timestamp);
    this.velocityHistory.push({ velocity, time: timestamp });
    if (this.velocityHistory.length > 30) {
      this.velocityHistory.shift();
    }

    // Calculate stability (inverse of velocity variance)
    const stability = this.calculateStability(timestamp);

    // Calculate confidence (0-1, how close to threshold)
    const confidence = this.calculateConfidence(value);

    // Predict when gesture will trigger based on current velocity
    const predictedTime = this.predictTrigger(value, velocity);

    // State transitions with hysteresis
    const newPhase = this.calculatePhase(value, velocity);

    // Update state
    if (newPhase !== this.state.phase) {
      this.state.phaseStartTime = timestamp;
      this.state.lastTransition = timestamp;
    }

    this.state = {
      phase: newPhase,
      confidence,
      predictedTime,
      velocity,
      stability,
      phaseStartTime: this.state.phaseStartTime,
      lastTransition: this.state.lastTransition,
    };

    return this.state;
  }

  private calculateVelocity(timestamp: number): number {
    if (this.valueHistory.length < 2) return 0;

    const recent = this.valueHistory.filter(h => timestamp - h.time < 100);
    if (recent.length < 2) return 0;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = (last.time - first.time) / 1000; // seconds

    return dt > 0 ? Math.abs(last.value - first.value) / dt : 0;
  }

  private calculateStability(timestamp: number): number {
    const recent = this.velocityHistory.filter(h => timestamp - h.time < this.config.stabilityWindow);
    if (recent.length < 2) return 1;

    const velocities = recent.map(h => h.velocity);
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);

    // Convert to 0-1 stability score (lower variance = higher stability)
    return Math.max(0, Math.min(1, 1 - stdDev * 10));
  }

  private calculateConfidence(value: number): number {
    const { enterThreshold, exitThreshold, approachZone } = this.config;

    switch (this.state.phase) {
      case 'idle':
        // Confidence increases as we approach enter threshold
        const distanceToEnter = value - enterThreshold;
        if (distanceToEnter > approachZone) return 0;
        return Math.max(0, 1 - distanceToEnter / approachZone);

      case 'approaching':
        // High confidence, getting close
        const approachProgress = (value - (enterThreshold + approachZone)) / approachZone;
        return Math.min(1, 0.5 + approachProgress * 0.5);

      case 'active':
        // Fully triggered
        return 1;

      case 'releasing':
        // Confidence decreasing as we move toward exit threshold
        const releaseProgress = (value - enterThreshold) / (exitThreshold - enterThreshold);
        return Math.max(0, 1 - releaseProgress);

      case 'cooldown':
        return 0;

      default:
        return 0;
    }
  }

  private predictTrigger(value: number, velocity: number): number {
    const { enterThreshold } = this.config;

    if (velocity === 0 || value >= enterThreshold) {
      return value >= enterThreshold ? 0 : Infinity;
    }

    // Predict time to reach threshold based on current velocity
    const distanceToThreshold = value - enterThreshold;
    const timeToThreshold = Math.abs(distanceToThreshold / velocity) * 1000; // ms

    return Math.min(timeToThreshold, this.config.predictionHorizon * 2);
  }

  private calculatePhase(value: number, velocity: number): GesturePhase {
    const { enterThreshold, exitThreshold, approachZone, cooldownMs } = this.config;
    const now = Date.now();

    switch (this.state.phase) {
      case 'idle':
        // Transition to approaching when getting close
        if (value < enterThreshold + approachZone) {
          return 'approaching';
        }
        return 'idle';

      case 'approaching':
        // Trigger when crossing enter threshold
        if (value < enterThreshold) {
          return 'active';
        }
        // Fall back to idle if moving away
        if (value > enterThreshold + approachZone * 1.5) {
          return 'idle';
        }
        return 'approaching';

      case 'active':
        // Release when crossing exit threshold
        if (value > exitThreshold) {
          return 'releasing';
        }
        return 'active';

      case 'releasing':
        // Enter cooldown after release
        if (value > exitThreshold * 1.1) {
          return 'cooldown';
        }
        // Re-activate if moving back toward threshold
        if (value < enterThreshold) {
          return 'active';
        }
        return 'releasing';

      case 'cooldown':
        // Exit cooldown after delay
        if (now - this.state.lastTransition > cooldownMs) {
          return 'idle';
        }
        return 'cooldown';

      default:
        return 'idle';
    }
  }

  // Get current state
  getState(): GestureState {
    return { ...this.state };
  }

  // Reset state machine
  reset(): void {
    this.state = {
      phase: 'idle',
      confidence: 0,
      predictedTime: Infinity,
      velocity: 0,
      stability: 1,
      phaseStartTime: Date.now(),
      lastTransition: Date.now(),
    };
    this.valueHistory = [];
    this.velocityHistory = [];
  }

  // Update configuration
  setConfig(config: Partial<StateMachineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
