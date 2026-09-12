// adaptive-calibration.ts — Auto-calibrate thresholds based on user's hand size
// Measures hand dimensions during first few seconds and adjusts thresholds accordingly

export interface CalibrationData {
  palmWidth: number;
  fingerLengths: number[];
  handSpan: number;
  avgPinchDistance: number;
  calibrationTime: number;
  sampleCount: number;
}

export interface CalibratedThresholds {
  pinchEnter: number;
  pinchExit: number;
  clawThreshold: number;
  openPalmThreshold: number;
}

export class AdaptiveCalibration {
  private samples: Array<{
    palmWidth: number;
    fingerLengths: number[];
    pinchDistance: number;
    timestamp: number;
  }> = [];
  
  private calibrationDuration = 3000; // 3 seconds
  private minSamples = 30;
  private isCalibrated = false;
  private calibrationStartTime: number | null = null;
  
  // Calibrate from hand landmarks
  calibrate(landmarks: Array<{ x: number; y: number; z: number }>): CalibrationData | null {
    const now = Date.now();
    
    if (!this.calibrationStartTime) {
      this.calibrationStartTime = now;
    }
    
    // Calculate hand metrics
    const palmWidth = this.calculatePalmWidth(landmarks);
    const fingerLengths = this.calculateFingerLengths(landmarks);
    const pinchDistance = this.calculatePinchDistance(landmarks);
    
    // Store sample
    this.samples.push({
      palmWidth,
      fingerLengths,
      pinchDistance,
      timestamp: now,
    });
    
    // Keep only recent samples
    const cutoff = now - this.calibrationDuration;
    this.samples = this.samples.filter(s => s.timestamp > cutoff);
    
    // Check if we have enough data
    if (this.samples.length >= this.minSamples && 
        now - this.calibrationStartTime >= this.calibrationDuration) {
      this.isCalibrated = true;
      return this.getCalibrationData();
    }
    
    return null;
  }
  
  // Get calibrated thresholds based on hand size
  getCalibratedThresholds(): CalibratedThresholds | null {
    if (!this.isCalibrated) return null;
    
    const data = this.getCalibrationData();
    if (!data) return null;
    
    // Adaptive thresholds based on palm width
    // Smaller hands need tighter thresholds, larger hands need looser
    const palmScale = data.palmWidth / 0.1; // Normalize to average hand size
    
    return {
      pinchEnter: 0.15 * palmScale, // Smaller hands = smaller threshold
      pinchExit: 0.25 * palmScale,
      clawThreshold: 0.4 * palmScale,
      openPalmThreshold: 0.7 * palmScale,
    };
  }
  
  private getCalibrationData(): CalibrationData | null {
    if (this.samples.length === 0) return null;
    
    // Average all samples
    const avgPalmWidth = this.samples.reduce((sum, s) => sum + s.palmWidth, 0) / this.samples.length;
    
    const avgFingerLengths = [0, 0, 0, 0, 0];
    this.samples.forEach(s => {
      s.fingerLengths.forEach((len, i) => {
        avgFingerLengths[i] += len;
      });
    });
    avgFingerLengths.forEach((_, i) => {
      avgFingerLengths[i] /= this.samples.length;
    });
    
    const avgPinchDistance = this.samples.reduce((sum, s) => sum + s.pinchDistance, 0) / this.samples.length;
    
    const handSpan = Math.max(...avgFingerLengths);
    
    return {
      palmWidth: avgPalmWidth,
      fingerLengths: avgFingerLengths,
      handSpan,
      avgPinchDistance,
      calibrationTime: Date.now() - (this.calibrationStartTime || Date.now()),
      sampleCount: this.samples.length,
    };
  }
  
  private calculatePalmWidth(landmarks: Array<{ x: number; y: number; z: number }>): number {
    // Distance from wrist (0) to middle finger MCP (9)
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    
    const dx = middleMCP.x - wrist.x;
    const dy = middleMCP.y - wrist.y;
    const dz = middleMCP.z - wrist.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  private calculateFingerLengths(landmarks: Array<{ x: number; y: number; z: number }>): number[] {
    const fingers = [
      [5, 8],   // Thumb: MCP to tip
      [5, 8],   // Index: MCP to tip
      [9, 12],  // Middle: MCP to tip
      [13, 16], // Ring: MCP to tip
      [17, 20], // Pinky: MCP to tip
    ];
    
    return fingers.map(([mcp, tip]) => {
      const mcpPoint = landmarks[mcp];
      const tipPoint = landmarks[tip];
      
      const dx = tipPoint.x - mcpPoint.x;
      const dy = tipPoint.y - mcpPoint.y;
      const dz = tipPoint.z - mcpPoint.z;
      
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    });
  }
  
  private calculatePinchDistance(landmarks: Array<{ x: number; y: number; z: number }>): number {
    // Distance between thumb tip (4) and index tip (8)
    const thumb = landmarks[4];
    const index = landmarks[8];
    
    const dx = index.x - thumb.x;
    const dy = index.y - thumb.y;
    const dz = index.z - thumb.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  // Check if calibration is complete
  isComplete(): boolean {
    return this.isCalibrated;
  }
  
  // Get calibration progress (0-1)
  getProgress(): number {
    if (!this.calibrationStartTime) return 0;
    
    const elapsed = Date.now() - this.calibrationStartTime;
    const timeProgress = Math.min(elapsed / this.calibrationDuration, 1);
    const sampleProgress = Math.min(this.samples.length / this.minSamples, 1);
    
    return Math.min(timeProgress, sampleProgress);
  }
  
  // Reset calibration
  reset(): void {
    this.samples = [];
    this.isCalibrated = false;
    this.calibrationStartTime = null;
  }
}
