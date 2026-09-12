import { GestureConfig } from '../engine/gesture-engine';
import { GestureDefinition } from '../engine/gestures-defaults';

interface ThresholdPanelProps {
  thresholds: GestureConfig;
  onChange: (category: string, key: string, value: number) => void;
  selectedGesture: GestureDefinition;
}

export function ThresholdPanel({ thresholds, onChange, selectedGesture }: ThresholdPanelProps) {
  const getSlidersForGesture = () => {
    const type = selectedGesture.type;

    switch (type) {
      case 'pinch':
      case 'scrub':
        return [
          { key: 'ratio_enter_frontal', label: 'Ratio Enter', min: 0.1, max: 0.6, step: 0.01, value: thresholds.pinch.ratio_enter_frontal, category: 'pinch' },
          { key: 'ema_rate', label: 'EMA Rate', min: 0.1, max: 0.9, step: 0.05, value: thresholds.pinch.ema_rate, category: 'pinch' },
          { key: 'release_bar_slow', label: 'Release Bar', min: 0.3, max: 0.9, step: 0.01, value: thresholds.pinch.release_bar_slow, category: 'pinch' },
        ];
      case 'claw':
        return [
          { key: 'gap_floor_enter', label: 'Gap Floor', min: 0.4, max: 1.2, step: 0.01, value: thresholds.claw.gap_floor_enter, category: 'claw' },
          { key: 'c8_enter', label: 'Index Curl', min: 0.2, max: 1.0, step: 0.05, value: thresholds.claw.c8_enter, category: 'claw' },
        ];
      case 'hold':
        return [
          { key: 'duration_ms', label: 'Hold Duration (ms)', min: 300, max: 3000, step: 50, value: thresholds.hold_rotate.duration_ms, category: 'hold_rotate' },
          { key: 'drift_px', label: 'Max Drift (px)', min: 20, max: 200, step: 5, value: thresholds.hold_rotate.drift_px, category: 'hold_rotate' },
        ];
      default:
        return [];
    }
  };

  const sliders = getSlidersForGesture();

  if (sliders.length === 0) {
    return (
      <div className="glass-panel p-3">
        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          No adjustable thresholds for {selectedGesture.name}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          THRESHOLD TUNING — {selectedGesture.name}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        {sliders.map(slider => (
          <div key={slider.key} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                {slider.label}
              </label>
              <span className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>
                {slider.value.toFixed(slider.step < 1 ? 2 : 0)}
              </span>
            </div>
            <input
              type="range"
              className="threshold-slider"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={slider.value}
              onChange={(e) => onChange(slider.category, slider.key, parseFloat(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
