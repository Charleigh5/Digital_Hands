// performance-cache.ts — Cache expensive calculations to improve performance
// Caches landmark transformations, distances, and other computed values

export class PerformanceCache {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private maxAge: number = 16; // ~60fps, cache valid for 1 frame
  
  constructor(maxAgeMs: number = 16) {
    this.maxAge = maxAgeMs;
  }
  
  // Get cached value or compute and cache it
  get<T>(key: string, compute: () => T): T {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.maxAge) {
      return cached.value as T;
    }
    
    const value = compute();
    this.cache.set(key, { value, timestamp: now });
    return value;
  }
  
  // Force update a cached value
  set<T>(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }
  
  // Check if key exists and is fresh
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.maxAge;
  }
  
  // Invalidate specific key
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  // Clear all cache
  clear(): void {
    this.cache.clear();
  }
  
  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Pre-computed landmark calculations
export class LandmarkCache {
  private cache: PerformanceCache;
  
  constructor() {
    this.cache = new PerformanceCache();
  }
  
  // Cache distance between two landmarks
  getDistance(
    landmarks: Array<{ x: number; y: number; z: number }>,
    idx1: number,
    idx2: number
  ): number {
    const key = `dist_${idx1}_${idx2}`;
    return this.cache.get(key, () => {
      const p1 = landmarks[idx1];
      const p2 = landmarks[idx2];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    });
  }
  
  // Cache midpoint between two landmarks
  getMidpoint(
    landmarks: Array<{ x: number; y: number; z: number }>,
    idx1: number,
    idx2: number
  ): { x: number; y: number; z: number } {
    const key = `mid_${idx1}_${idx2}`;
    return this.cache.get(key, () => {
      const p1 = landmarks[idx1];
      const p2 = landmarks[idx2];
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2,
      };
    });
  }
  
  // Cache angle between three landmarks
  getAngle(
    landmarks: Array<{ x: number; y: number; z: number }>,
    idx1: number,
    idx2: number,
    idx3: number
  ): number {
    const key = `angle_${idx1}_${idx2}_${idx3}`;
    return this.cache.get(key, () => {
      const p1 = landmarks[idx1];
      const p2 = landmarks[idx2];
      const p3 = landmarks[idx3];
      
      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
      
      const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
      
      if (mag1 === 0 || mag2 === 0) return 0;
      
      const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      return Math.acos(cosAngle) * (180 / Math.PI);
    });
  }
  
  // Cache palm center
  getPalmCenter(landmarks: Array<{ x: number; y: number; z: number }>): { x: number; y: number; z: number } {
    const key = 'palm_center';
    return this.cache.get(key, () => {
      // Average of wrist, thumb MCP, index MCP, pinky MCP
      const indices = [0, 1, 5, 17];
      const sum = indices.reduce(
        (acc, idx) => ({
          x: acc.x + landmarks[idx].x,
          y: acc.y + landmarks[idx].y,
          z: acc.z + landmarks[idx].z,
        }),
        { x: 0, y: 0, z: 0 }
      );
      
      return {
        x: sum.x / indices.length,
        y: sum.y / indices.length,
        z: sum.z / indices.length,
      };
    });
  }
  
  // Cache hand bounding box
  getBoundingBox(landmarks: Array<{ x: number; y: number; z: number }>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  } {
    const key = 'bounding_box';
    return this.cache.get(key, () => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      landmarks.forEach(lm => {
        minX = Math.min(minX, lm.x);
        maxX = Math.max(maxX, lm.x);
        minY = Math.min(minY, lm.y);
        maxY = Math.max(maxY, lm.y);
      });
      
      return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    });
  }
  
  // Cache aspect ratio
  getAspectRatio(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const key = 'aspect_ratio';
    return this.cache.get(key, () => {
      const bbox = this.getBoundingBox(landmarks);
      return bbox.height > 0 ? bbox.width / bbox.height : 1;
    });
  }
  
  // Invalidate all landmark-based cache
  invalidateLandmarks(): void {
    this.cache.clear();
  }
}

// Transformation cache for screen coordinates
export class TransformationCache {
  private cache: PerformanceCache;
  
  constructor() {
    this.cache = new PerformanceCache();
  }
  
  // Cache screen coordinate transformation
  toScreen(
    landmark: { x: number; y: number; z: number },
    canvasWidth: number,
    canvasHeight: number,
    mirror: boolean = true
  ): { x: number; y: number } {
    const key = `screen_${landmark.x.toFixed(4)}_${landmark.y.toFixed(4)}_${canvasWidth}_${canvasHeight}_${mirror}`;
    return this.cache.get(key, () => ({
      x: (mirror ? 1 - landmark.x : landmark.x) * canvasWidth,
      y: landmark.y * canvasHeight,
    }));
  }
  
  // Cache cover-fit transformation
  getCoverFit(
    videoWidth: number,
    videoHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ): { drawW: number; drawH: number; drawX: number; drawY: number } {
    const key = `coverfit_${videoWidth}_${videoHeight}_${canvasWidth}_${canvasHeight}`;
    return this.cache.get(key, () => {
      const vAspect = videoWidth / videoHeight;
      const cAspect = canvasWidth / canvasHeight;
      
      let drawW: number, drawH: number, drawX: number, drawY: number;
      
      if (vAspect > cAspect) {
        drawH = canvasHeight;
        drawW = canvasHeight * vAspect;
        drawX = (canvasWidth - drawW) / 2;
        drawY = 0;
      } else {
        drawW = canvasWidth;
        drawH = canvasWidth / vAspect;
        drawX = 0;
        drawY = (canvasHeight - drawH) / 2;
      }
      
      return { drawW, drawH, drawX, drawY };
    });
  }
  
  // Clear cache
  clear(): void {
    this.cache.clear();
  }
}
