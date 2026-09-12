import React, { useState, useEffect, useRef } from 'react';
import { GestureTutorial, generateGestureKeyframes, interpolateKeyframes, calculateGestureSimilarity } from '../engine/gesture-tutorial-engine';
import { BONE_CONNECTIONS } from '../engine/gestures-defaults';

interface GestureTutorialPlayerProps {
  gestureType: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const GestureTutorialPlayer: React.FC<GestureTutorialPlayerProps> = ({
  gestureType,
  onComplete,
  onCancel,
}) => {
  const [tutorial, setTutorial] = useState<GestureTutorial | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<{ x: number; y: number; z: number }[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showBadExample, setShowBadExample] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'success' | 'failure' | 'in-progress'>('none');
  const [feedbackOpacity, setFeedbackOpacity] = useState(0);
  const [userLandmarks, setUserLandmarks] = useState<{ x: number; y: number; z: number }[] | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  // Initialize tutorial
  useEffect(() => {
    const tut = generateGestureKeyframes(gestureType);
    setTutorial(tut);
    setCurrentLandmarks(tut.keyframes[0].landmarks);
  }, [gestureType]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || isPaused || !tutorial) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const speed = 0.3; // Slow motion (30% speed)
      const adjustedTime = elapsed * speed;

      // Find current and next keyframe
      let currentFrame = tutorial.keyframes[0];
      let nextFrame = tutorial.keyframes[1];
      let frameIndex = 0;

      for (let i = 0; i < tutorial.keyframes.length - 1; i++) {
        if (adjustedTime >= tutorial.keyframes[i].timestamp && 
            adjustedTime < tutorial.keyframes[i + 1].timestamp) {
          currentFrame = tutorial.keyframes[i];
          nextFrame = tutorial.keyframes[i + 1];
          frameIndex = i;
          break;
        }
      }

      setCurrentFrameIndex(frameIndex);

      // Check if we're at a key point
      if (currentFrame.isKeyPoint && elapsed > 0) {
        const timeInKeyPoint = adjustedTime - currentFrame.timestamp;
        if (timeInKeyPoint < 1000) {
          // Pause at key point for 1 second
          setCurrentLandmarks(currentFrame.landmarks);
          animationRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      // Interpolate between frames
      const frameDuration = nextFrame.timestamp - currentFrame.timestamp;
      const progress = (adjustedTime - currentFrame.timestamp) / frameDuration;
      
      if (progress < 1) {
        const interpolated = interpolateKeyframes(currentFrame, nextFrame, progress);
        setCurrentLandmarks(interpolated);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setIsPlaying(false);
        setCurrentLandmarks(nextFrame.landmarks);
      }
    };

    startTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isPaused, tutorial]);

  // Draw hand skeleton
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || currentLandmarks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = 'rgba(2, 15, 12, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(140, 240, 225, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw bones
    BONE_CONNECTIONS.forEach(([a, b]) => {
      const pA = {
        x: currentLandmarks[a].x * width,
        y: currentLandmarks[a].y * height,
      };
      const pB = {
        x: currentLandmarks[b].x * width,
        y: currentLandmarks[b].y * height,
      };

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.strokeStyle = showBadExample ? 'rgba(255, 107, 107, 0.7)' : 'rgba(111, 229, 214, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glow
      ctx.strokeStyle = showBadExample ? 'rgba(255, 107, 107, 0.2)' : 'rgba(111, 229, 214, 0.2)';
      ctx.lineWidth = 8;
      ctx.stroke();
    });

    // Draw landmarks
    currentLandmarks.forEach((lm, i) => {
      const p = {
        x: lm.x * width,
        y: lm.y * height,
      };
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const radius = isTip ? 6 : 4;

      // Glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
      gradient.addColorStop(0, showBadExample ? 'rgba(255, 107, 107, 0.4)' : 'rgba(111, 229, 214, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Point
      ctx.fillStyle = showBadExample ? '#ff6b6b' : '#6fe5d6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw key point indicator
    if (tutorial && tutorial.keyframes[currentFrameIndex]?.isKeyPoint) {
      const keyPoint = tutorial.keyframes[currentFrameIndex];
      ctx.fillStyle = 'rgba(140, 240, 225, 0.9)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(keyPoint.label || 'Key Point', width / 2, 40);
    }

    // Draw user landmarks if verifying
    if (userLandmarks && isVerifying) {
      BONE_CONNECTIONS.forEach(([a, b]) => {
        const pA = {
          x: userLandmarks[a].x * width,
          y: userLandmarks[a].y * height,
        };
        const pB = {
          x: userLandmarks[b].x * width,
          y: userLandmarks[b].y * height,
        };

        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }, [currentLandmarks, currentFrameIndex, showBadExample, userLandmarks, isVerifying, tutorial]);

  // Feedback fade animation
  useEffect(() => {
    if (feedback !== 'none') {
      setFeedbackOpacity(1);
      const timer = setTimeout(() => {
        setFeedbackOpacity(0);
        setTimeout(() => setFeedback('none'), 500);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handlePlayGood = () => {
    if (!tutorial) return;
    setShowBadExample(false);
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentFrameIndex(0);
  };

  const handlePlayBad = () => {
    if (!tutorial) return;
    setShowBadExample(true);
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentFrameIndex(0);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStartVerification = () => {
    setIsVerifying(true);
    setAttempts(0);
    setSuccesses(0);
  };

  const handleVerifyAttempt = (landmarks: { x: number; y: number; z: number }[]) => {
    if (!tutorial || !isVerifying) return;

    setUserLandmarks(landmarks);
    setAttempts(prev => prev + 1);

    // Compare with good example
    const targetFrame = tutorial.goodExample[tutorial.goodExample.length - 1];
    const similarity = calculateGestureSimilarity(landmarks, targetFrame.landmarks);

    if (similarity >= tutorial.successThreshold) {
      setSuccesses(prev => {
        const newSuccesses = prev + 1;
        setFeedback('success');
        
        if (newSuccesses >= tutorial.requiredAttempts) {
          setTimeout(() => {
            onComplete();
          }, 2500);
        }
        
        return newSuccesses;
      });
    } else {
      setFeedback('failure');
    }

    // Clear user landmarks after 2 seconds
    setTimeout(() => {
      setUserLandmarks(null);
    }, 2000);
  };

  if (!tutorial) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2, 15, 12, 0.95)' }}>
      <div className="relative w-full max-w-4xl mx-4">
        {/* Header */}
        <div className="glass-panel p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {tutorial.name} Tutorial
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {tutorial.description}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-2xl hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>

          {/* Canvas */}
          <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-glow)' }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full"
              style={{ background: 'var(--bg-deep)' }}
            />

            {/* Feedback overlay */}
            {feedback !== 'none' && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  opacity: feedbackOpacity,
                  transition: 'opacity 0.5s ease-in-out',
                }}
              >
                {feedback === 'success' && (
                  <div className="text-9xl" style={{ color: '#6fe5d6' }}>
                    ✓
                  </div>
                )}
                {feedback === 'failure' && (
                  <div className="text-9xl" style={{ color: '#ff6b6b' }}>
                    ✗
                  </div>
                )}
              </div>
            )}

            {/* Mode indicator */}
            {showBadExample && (
              <div
                className="absolute top-4 left-4 px-3 py-1 rounded"
                style={{
                  background: 'rgba(255, 107, 107, 0.2)',
                  border: '1px solid rgba(255, 107, 107, 0.5)',
                  color: '#ff6b6b',
                }}
              >
                Bad Example
              </div>
            )}

            {/* Verification mode indicator */}
            {isVerifying && (
              <div
                className="absolute top-4 right-4 px-3 py-1 rounded"
                style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  border: '1px solid rgba(255, 215, 0, 0.5)',
                  color: '#ffd700',
                }}
              >
                Verification Mode: {successes}/{tutorial.requiredAttempts}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              {!isVerifying ? (
                <>
                  <button
                    onClick={handlePlayGood}
                    disabled={isPlaying}
                    className="px-4 py-2 rounded transition-all"
                    style={{
                      background: 'rgba(111, 229, 214, 0.2)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      opacity: isPlaying ? 0.5 : 1,
                    }}
                  >
                    ▶ Good Example
                  </button>
                  <button
                    onClick={handlePlayBad}
                    disabled={isPlaying}
                    className="px-4 py-2 rounded transition-all"
                    style={{
                      background: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.5)',
                      color: '#ff6b6b',
                      opacity: isPlaying ? 0.5 : 1,
                    }}
                  >
                    ▶ Bad Example
                  </button>
                  {isPlaying && (
                    <button
                      onClick={handlePause}
                      className="px-4 py-2 rounded transition-all"
                      style={{
                        background: 'rgba(140, 240, 225, 0.2)',
                        border: '1px solid var(--text-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Perform the gesture 3 times to unlock
                </div>
              )}
            </div>

            {!isVerifying && !isPlaying && (
              <button
                onClick={handleStartVerification}
                className="px-6 py-2 rounded font-bold transition-all"
                style={{
                  background: 'rgba(111, 229, 214, 0.3)',
                  border: '2px solid var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                Start Practice
              </button>
            )}
          </div>

          {/* Progress */}
          {isVerifying && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Progress
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  {successes} / {tutorial.requiredAttempts}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(140, 240, 225, 0.1)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(successes / tutorial.requiredAttempts) * 100}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
