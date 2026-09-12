import { useState } from 'react';

export function CodeEditor() {
  const [code, setCode] = useState(`// Gesture Detection Code
// Edit this code to customize gesture behavior

function detectPinch(landmarks, thresholds) {
  const thumb = landmarks[4];
  const index = landmarks[8];
  
  const distance = Math.sqrt(
    Math.pow(thumb.x - index.x, 2) +
    Math.pow(thumb.y - index.y, 2)
  );
  
  const palmWidth = Math.sqrt(
    Math.pow(landmarks[0].x - landmarks[9].x, 2) +
    Math.pow(landmarks[0].y - landmarks[9].y, 2)
  );
  
  const ratio = distance / palmWidth;
  
  return {
    active: ratio < thresholds.pinch.ratio_enter_frontal,
    confidence: 1 - (ratio / thresholds.pinch.ratio_enter_frontal),
    ratio: ratio
  };
}

// Export for use in gesture engine
export { detectPinch };`);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          CODE EDITOR
        </span>
        <button
          onClick={handleSave}
          className="text-[9px] px-2 py-1 rounded cursor-pointer"
          style={{
            background: saved ? 'rgba(111, 229, 214, 0.3)' : 'rgba(111, 229, 214, 0.15)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
          }}
        >
          {saved ? '✓ Saved' : '💾 Save'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full p-3 resize-none outline-none"
          style={{
            background: 'rgba(2, 15, 12, 0.8)',
            color: 'var(--text-primary)',
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: '11px',
            lineHeight: '1.5',
            border: 'none',
          }}
          spellCheck={false}
        />
      </div>

      <div className="px-3 py-2 border-t text-[9px]"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)', color: 'var(--text-secondary)' }}>
        <span>JavaScript • Gesture Detection • Auto-save enabled</span>
      </div>
    </div>
  );
}
