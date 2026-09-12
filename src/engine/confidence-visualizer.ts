// confidence-visualizer.ts — Real-time confidence visualization for gestures
// Provides visual feedback showing how close user is to triggering a gesture

export interface ConfidenceVisualizerConfig {
  showRing: boolean;
  showBar: boolean;
  showPrediction: boolean;
  ringRadius: number;
  ringWidth: number;
  barHeight: number;
  colorIdle: string;
  colorApproaching: string;
  colorActive: string;
  colorPrediction: string;
}

const DEFAULT_CONFIG: ConfidenceVisualizerConfig = {
  showRing: true,
  showBar: true,
  showPrediction: true,
  ringRadius: 50,
  ringWidth: 8,
  barHeight: 6,
  colorIdle: 'rgba(140, 240, 225, 0.3)',
  colorApproaching: 'rgba(140, 240, 225, 0.7)',
  colorActive: 'rgba(111, 229, 214, 1)',
  colorPrediction: 'rgba(255, 217, 61, 0.8)',
};

export class ConfidenceVisualizer {
  private config: ConfidenceVisualizerConfig;
  
  constructor(config: Partial<ConfidenceVisualizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // Draw confidence ring around pinch point
  drawConfidenceRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    confidence: number,
    phase: string,
    predictedTime: number
  ): void {
    if (!this.config.showRing) return;
    
    const { ringRadius, ringWidth } = this.config;
    
    // Background ring
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = this.config.colorIdle;
    ctx.lineWidth = ringWidth;
    ctx.stroke();
    
    // Confidence arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * confidence);
    
    let color = this.config.colorIdle;
    if (phase === 'approaching') {
      color = this.config.colorApproaching;
    } else if (phase === 'active') {
      color = this.config.colorActive;
    }
    
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Prediction indicator (pulsing ring)
    if (this.config.showPrediction && predictedTime < 200 && predictedTime > 0) {
      const pulseScale = 1 + (1 - predictedTime / 200) * 0.3;
      const pulseAlpha = 0.3 + (1 - predictedTime / 200) * 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, ringRadius * pulseScale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 217, 61, ${pulseAlpha})`;
      ctx.lineWidth = ringWidth / 2;
      ctx.stroke();
    }
    
    // Active state glow
    if (phase === 'active') {
      const gradient = ctx.createRadialGradient(x, y, ringRadius * 0.5, x, y, ringRadius * 1.5);
      gradient.addColorStop(0, 'rgba(111, 229, 214, 0.3)');
      gradient.addColorStop(1, 'rgba(111, 229, 214, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, ringRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
  
  // Draw confidence bar (horizontal)
  drawConfidenceBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    confidence: number,
    phase: string
  ): void {
    if (!this.config.showBar) return;
    
    const { barHeight } = this.config;
    
    // Background
    ctx.fillStyle = 'rgba(140, 240, 225, 0.1)';
    ctx.fillRect(x, y, width, barHeight);
    
    // Confidence fill
    let color = this.config.colorIdle;
    if (phase === 'approaching') {
      color = this.config.colorApproaching;
    } else if (phase === 'active') {
      color = this.config.colorActive;
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * confidence, barHeight);
    
    // Border
    ctx.strokeStyle = 'rgba(140, 240, 225, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, barHeight);
  }
  
  // Draw velocity indicator
  drawVelocityIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    velocity: number,
    maxVelocity: number = 5
  ): void {
    const normalizedVelocity = Math.min(Math.abs(velocity) / maxVelocity, 1);
    const barWidth = 60;
    const barHeight = 4;
    
    // Background
    ctx.fillStyle = 'rgba(140, 240, 225, 0.1)';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Velocity fill
    const velocityColor = velocity > 0 
      ? 'rgba(255, 107, 107, 0.7)'  // Red for positive (opening)
      : 'rgba(111, 229, 214, 0.7)'; // Teal for negative (closing)
    
    ctx.fillStyle = velocityColor;
    ctx.fillRect(x, y, barWidth * normalizedVelocity, barHeight);
    
    // Label
    ctx.fillStyle = 'rgba(140, 240, 225, 0.6)';
    ctx.font = '9px monospace';
    ctx.fillText(`v: ${velocity.toFixed(2)}`, x, y - 4);
  }
  
  // Draw stability indicator
  drawStabilityIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    stability: number
  ): void {
    const radius = 8;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140, 240, 225, 0.1)';
    ctx.fill();
    
    // Stability fill
    const stabilityColor = stability > 0.7 
      ? 'rgba(111, 229, 214, 0.8)'  // High stability
      : stability > 0.4 
        ? 'rgba(255, 217, 61, 0.8)'  // Medium
        : 'rgba(255, 107, 107, 0.8)'; // Low
    
    ctx.beginPath();
    ctx.arc(x, y, radius * stability, 0, Math.PI * 2);
    ctx.fillStyle = stabilityColor;
    ctx.fill();
    
    // Label
    ctx.fillStyle = 'rgba(140, 240, 225, 0.6)';
    ctx.font = '9px monospace';
    ctx.fillText(`s: ${(stability * 100).toFixed(0)}%`, x + radius + 4, y + 3);
  }
  
  // Draw complete HUD (all visualizers)
  drawHUD(
    ctx: CanvasRenderingContext2D,
    pinchX: number,
    pinchY: number,
    confidence: number,
    phase: string,
    predictedTime: number,
    velocity: number,
    stability: number
  ): void {
    // Confidence ring around pinch point
    this.drawConfidenceRing(ctx, pinchX, pinchY, confidence, phase, predictedTime);
    
    // Confidence bar at bottom
    const barY = ctx.canvas.height - 60;
    const barX = 20;
    const barWidth = ctx.canvas.width - 40;
    this.drawConfidenceBar(ctx, barX, barY, barWidth, confidence, phase);
    
    // Velocity indicator
    this.drawVelocityIndicator(ctx, barX, barY + 20, velocity);
    
    // Stability indicator
    this.drawStabilityIndicator(ctx, ctx.canvas.width - 40, barY + 22, stability);
    
    // Phase label
    ctx.fillStyle = 'rgba(140, 240, 225, 0.8)';
    ctx.font = '11px monospace';
    ctx.fillText(`Phase: ${phase.toUpperCase()}`, barX, barY - 8);
    
    // Prediction time
    if (predictedTime < 1000 && predictedTime > 0) {
      ctx.fillStyle = this.config.colorPrediction;
      ctx.fillText(`Predicted: ${predictedTime.toFixed(0)}ms`, barX + 150, barY - 8);
    }
  }
  
  // Update configuration
  setConfig(config: Partial<ConfidenceVisualizerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
