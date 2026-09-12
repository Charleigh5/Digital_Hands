// VisualGuideOverlay.tsx — On-screen visual guidance system
import { useState, useEffect } from 'react';

export interface GuideStep {
  id: string;
  title: string;
  instruction: string;
  type: 'arrow' | 'highlight' | 'circle' | 'text' | 'progress';
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  target?: string; // CSS selector or element ID
  color?: string;
  duration?: number; // Auto-advance after ms
  onNext?: () => void;
}

interface VisualGuideOverlayProps {
  steps: GuideStep[];
  currentStepIndex: number;
  isActive: boolean;
  onComplete: () => void;
  onStepComplete: (stepId: string) => void;
}

export function VisualGuideOverlay({
  steps,
  currentStepIndex,
  isActive,
  onComplete,
  onStepComplete,
}: VisualGuideOverlayProps) {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 50);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const step = steps[currentStepIndex];
    if (step?.duration) {
      const timer = setTimeout(() => {
        onStepComplete(step.id);
        if (currentStepIndex >= steps.length - 1) {
          onComplete();
        }
      }, step.duration);

      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, isActive, steps, onComplete, onStepComplete]);

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStepIndex];
  if (!step) return null;

  const pulse = Math.sin(pulsePhase * 0.1) * 0.3 + 0.7;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      {/* Semi-transparent overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(2, 15, 12, 0.3)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Guide content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Highlight area */}
        {step.type === 'highlight' && step.position && step.size && (
          <div
            className="absolute rounded-lg"
            style={{
              left: `${step.position.x}%`,
              top: `${step.position.y}%`,
              width: `${step.size.width}%`,
              height: `${step.size.height}%`,
              border: `3px solid ${step.color || 'var(--accent)'}`,
              boxShadow: `0 0 20px ${step.color || 'var(--accent)'}, inset 0 0 20px rgba(140, 240, 225, 0.2)`,
              opacity: pulse,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Circle indicator */}
        {step.type === 'circle' && step.position && (
          <div
            className="absolute rounded-full"
            style={{
              left: `${step.position.x}%`,
              top: `${step.position.y}%`,
              width: '60px',
              height: '60px',
              transform: 'translate(-50%, -50%)',
              border: `3px solid ${step.color || 'var(--accent)'}`,
              boxShadow: `0 0 30px ${step.color || 'var(--accent)'}`,
              opacity: pulse,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${step.color || 'var(--accent)'}40 0%, transparent 70%)`,
              }}
            />
          </div>
        )}

        {/* Arrow indicator */}
        {step.type === 'arrow' && step.position && (
          <div
            className="absolute"
            style={{
              left: `${step.position.x}%`,
              top: `${step.position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" style={{ opacity: pulse }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={step.color || 'var(--accent)'} />
                </marker>
              </defs>
              <line
                x1="10"
                y1="50"
                x2="50"
                y2="10"
                stroke={step.color || 'var(--accent)'}
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          </div>
        )}

        {/* Instruction card */}
        <div
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel p-6 max-w-md"
          style={{
            pointerEvents: 'auto',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">{getStepIcon(step.type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {step.title}
                </h3>
                <span
                  className="text-[9px] px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(140, 240, 225, 0.15)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {currentStepIndex + 1}/{steps.length}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {step.instruction}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all"
                style={{
                  background:
                    i <= currentStepIndex ? 'var(--accent)' : 'rgba(140, 240, 225, 0.2)',
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onStepComplete(step.id)}
              className="flex-1 text-[10px] px-3 py-2 rounded cursor-pointer font-bold"
              style={{
                background: 'rgba(111, 229, 214, 0.2)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
              }}
            >
              {currentStepIndex < steps.length - 1 ? 'Next →' : 'Complete ✓'}
            </button>
            <button
              onClick={onComplete}
              className="text-[10px] px-3 py-2 rounded cursor-pointer"
              style={{
                background: 'transparent',
                border: '1px solid rgba(140, 240, 225, 0.2)',
                color: 'var(--text-secondary)',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

function getStepIcon(type: string): string {
  switch (type) {
    case 'arrow': return '→';
    case 'highlight': return '◉';
    case 'circle': return '◎';
    case 'text': return '💬';
    case 'progress': return '⏳';
    default: return '📍';
  }
}

// Preset tutorial sequences
export const TUTORIALS = {
  pinch: [
    {
      id: 'pinch-1',
      title: 'Position Your Hand',
      instruction: 'Hold your hand up in front of the camera, about 1-2 feet away. Make sure good lighting is on your hand.',
      type: 'text' as const,
      duration: 5000,
    },
    {
      id: 'pinch-2',
      title: 'Find the Confidence Ring',
      instruction: 'Look at the confidence ring around your pinch point. It will start filling up as you bring your fingers together.',
      type: 'circle' as const,
      position: { x: 50, y: 50 },
      color: 'var(--accent)',
      duration: 4000,
    },
    {
      id: 'pinch-3',
      title: 'Bring Fingers Together',
      instruction: 'Slowly bring your thumb and index finger together. Watch the ring fill up — it should turn bright teal when you pinch!',
      type: 'circle' as const,
      position: { x: 50, y: 50 },
      color: '#6fe5d6',
      duration: 6000,
    },
    {
      id: 'pinch-4',
      title: 'Release Slowly',
      instruction: 'Now slowly open your hand. The ring will fade back. Practice a few times to get the feel!',
      type: 'text' as const,
      duration: 5000,
    },
  ],

  '3d-objects': [
    {
      id: '3d-1',
      title: 'Open 3D Controls',
      instruction: 'Click the "⬡ 3D Objects" button in the top-right corner of the viewport to open the control panel.',
      type: 'highlight' as const,
      position: { x: 85, y: 5 },
      size: { width: 12, height: 8 },
      color: 'var(--accent)',
      duration: 8000,
    },
    {
      id: '3d-2',
      title: 'Add an Object',
      instruction: 'Click one of the object buttons (Cube, Sphere, or Torus) to spawn a 3D object. Watch it appear with physics!',
      type: 'highlight' as const,
      position: { x: 85, y: 15 },
      size: { width: 12, height: 20 },
      color: '#6fe5d6',
      duration: 8000,
    },
    {
      id: '3d-3',
      title: 'Try the Actions',
      instruction: 'Use the action buttons to throw objects, reset positions, or clear the scene. Objects have realistic physics!',
      type: 'highlight' as const,
      position: { x: 85, y: 40 },
      size: { width: 12, height: 15 },
      color: '#ffd700',
      duration: 8000,
    },
  ],

  'custom-gesture': [
    {
      id: 'gesture-1',
      title: 'Choose Your Gesture',
      instruction: 'Think of a gesture you want to create. It could be a wave, a snap, a specific finger pattern, or any hand movement.',
      type: 'text' as const,
      duration: 6000,
    },
    {
      id: 'gesture-2',
      title: 'Go to Edit View',
      instruction: 'Click the "✎ Edit" button in the top navigation bar to open the code editor where you\'ll define your gesture.',
      type: 'highlight' as const,
      position: { x: 20, y: 3 },
      size: { width: 8, height: 5 },
      color: 'var(--accent)',
      duration: 8000,
    },
    {
      id: 'gesture-3',
      title: 'Write Detection Logic',
      instruction: 'In the code editor, you can modify the gesture detection function. Use the landmark data to detect your specific hand pattern.',
      type: 'text' as const,
      duration: 8000,
    },
    {
      id: 'gesture-4',
      title: 'Test Your Gesture',
      instruction: 'Switch back to Live view and try performing your gesture. Adjust thresholds in the bottom panel if needed!',
      type: 'text' as const,
      duration: 6000,
    },
  ],
};
