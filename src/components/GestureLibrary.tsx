import { GestureDefinition } from '../engine/gestures-defaults';

interface GestureLibraryProps {
  gestures: GestureDefinition[];
  selectedGesture: GestureDefinition;
  onSelect: (gesture: GestureDefinition) => void;
}

export function GestureLibrary({ gestures, selectedGesture, onSelect }: GestureLibraryProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pinch': return '🤏';
      case 'claw': return '🦅';
      case 'clap': return '👏';
      case 'fling': return '💨';
      case 'hold': return '⏳';
      case 'stretch': return '🙌';
      case 'scrub': return '↔️';
      case 'palm': return '🖐️';
      default: return '✋';
    }
  };

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          GESTURE LIBRARY
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(140, 240, 225, 0.15)', color: 'var(--text-secondary)' }}>
          {gestures.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {gestures.map(gesture => (
          <div
            key={gesture.id}
            onClick={() => onSelect(gesture)}
            className={`gesture-card glass-panel-sm p-2.5 ${
              selectedGesture.id === gesture.id ? 'selected' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getTypeIcon(gesture.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {gesture.name}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {gesture.description}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[8px] px-1 py-0.5 rounded"
                style={{ background: 'rgba(140, 240, 225, 0.1)', color: 'var(--text-secondary)' }}>
                {gesture.hand}
              </span>
              <span className="text-[8px] px-1 py-0.5 rounded"
                style={{ background: 'rgba(140, 240, 225, 0.1)', color: 'var(--text-secondary)' }}>
                → {gesture.action}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
