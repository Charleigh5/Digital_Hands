// predictive-gesture.ts — Predict gesture completion before it happens
// Uses velocity and acceleration to anticipate gestures and reduce perceived latency

export interface PredictionResult {
  willTrigger: boolean;
  confidence: number;        // 0-1 confidence in prediction
  timeToTrigger: number;     // ms until predicted trigger
  predictedValue: number;    // predicted value at trigger time
  velocity: number;          // current velocity
  acceleration: number;      // current acceleration
}

export interface PredictionConfig {
  lookaheadMs: number;       // How far ahead to predict (default: 100ms)
  minVelocity: number;       // Minimum velocity to make prediction
  smoothingFactor: number;   // EMA smoothing for velocity (0-1)
  confidenceThreshold: number; // Min confidence to act on prediction
}

const DEFAULT_CONFIG: PredictionConfig = {
  lookaheadMs: 100,
  minVelocity: 0.5,
  smoothingFactor: 0.3,
  confidenceThreshold: 0.7,
};

export class PredictiveGestureDetector {
  private config: PredictionConfig;
  private valueHistory: Array<{ value: number; time: number }> = [];
  private smoothedVelocity: number = 0;
  private lastVelocity: number = 0;
  private lastAcceleration: number = 0;
  
  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // Update with current value and predict
  predict(value: number, threshold: number, timestamp: number = Date.now()): PredictionResult {
    // Record history
    this.valueHistory.push({ value, time: timestamp });
    
    // Keep only recent history (last 200ms)
    const cutoff = timestamp - 200;
    this.valueHistory = this.valueHistory.filter(h => h.time > cutoff);
    
    // Calculate velocity
    const velocity = this.calculateVelocity(timestamp);
    
    // Smooth velocity with EMA
    this.smoothedVelocity = this.config.smoothingFactor * velocity + 
                           (1 - this.config.smoothingFactor) * this.smoothedVelocity;
    
    // Calculate acceleration
    const acceleration = this.calculateAcceleration(velocity, timestamp);
    
    // Predict future value
    const predictedValue = this.predictFutureValue(value, this.smoothedVelocity, acceleration);
    
    // Determine if gesture will trigger
    const willTrigger = predictedValue < threshold;
    
    // Calculate confidence based on consistency and velocity
    const confidence = this.calculateConfidence(velocity, acceleration, value, threshold);
    
    // Calculate time to trigger
    const timeToTrigger = this.calculateTimeToTrigger(value, this.smoothedVelocity, threshold);
    
    return {
      willTrigger,
      confidence,
      timeToTrigger,
      predictedValue,
      velocity: this.smoothedVelocity,
      acceleration,
    };
  }
  
  private calculateVelocity(timestamp: number): number {
    if (this.valueHistory.length < 2) return 0;
    
    // Use last 3 samples for more stable velocity
    const recent = this.valueHistory.slice(-3);
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = (last.time - first.time) / 1000; // seconds
    
    if (dt === 0) return 0;
    
    return (last.value - first.value) / dt;
  }
  
  private calculateAcceleration(velocity: number, timestamp: number): number {
    const dt = 1 / 60; // Assume 60fps for acceleration calculation
    const acceleration = (velocity - this.lastVelocity) / dt;
    
    // Smooth acceleration
    const smoothed = 0.5 * acceleration + 0.5 * this.lastAcceleration;
    
    this.lastVelocity = velocity;
    this.lastAcceleration = smoothed;
    
    return smoothed;
  }
  
  private predictFutureValue(currentValue: number, velocity: number, acceleration: number): number {
    // Use kinematic equation: x = x0 + v*t + 0.5*a*t^2
    const t = this.config.lookaheadMs / 1000; // Convert to seconds
    return currentValue + velocity * t + 0.5 * acceleration * t * t;
  }
  
  private calculateConfidence(velocity: number, acceleration: number, currentValue: number, threshold: number): number {
    // Confidence is based on:
    // 1. Velocity magnitude (faster = more confident)
    // 2. Consistency of motion (low acceleration variance)
    // 3. Distance to threshold (closer = more confident)
    
    const velocityConfidence = Math.min(Math.abs(velocity) / this.config.minVelocity, 1);
    
    const distanceToThreshold = Math.abs(currentValue - threshold);
    const distanceConfidence = Math.max(0, 1 - distanceToThreshold / 0.3);
    
    // Acceleration consistency (lower variance = higher confidence)
    const accelConfidence = Math.max(0, 1 - Math.abs(acceleration) / 10);
    
    // Weighted combination
    return velocityConfidence * 0.5 + distanceConfidence * 0.3 + accelConfidence * 0.2;
  }
  
  private calculateTimeToTrigger(currentValue: number, velocity: number, threshold: number): number {
    if (velocity >= 0) return Infinity; // Not moving toward threshold
    
    const distance = currentValue - threshold;
    if (distance <= 0) return 0; // Already past threshold
    
    // Time = distance / velocity
    const time = distance / Math.abs(velocity);
    return time * 1000; // Convert to ms
  }
  
  // Get early trigger signal (triggers before actual threshold)
  getEarlyTriggerSignal(prediction: PredictionResult, threshold: number): boolean {
    if (!prediction.willTrigger) return false;
    if (prediction.confidence < this.config.confidenceThreshold) return false;
    if (prediction.timeToTrigger > this.config.lookaheadMs) return false;
    
    return true;
  }
  
  // Reset predictor
  reset(): void {
    this.valueHistory = [];
    this.smoothedVelocity = 0;
    this.lastVelocity = 0;
    this.lastAcceleration = 0;
  }
  
  // Update configuration
  setConfig(config: Partial<PredictionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
