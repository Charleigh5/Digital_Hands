type ViewMode = 'live' | 'edit' | 'record' | 'library' | 'ai' | '3d';

interface TopBarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  cameraActive: boolean;
  fps: number;
}

export function TopBar({ activeView, onViewChange, cameraActive, fps }: TopBarProps) {
  const views: { key: ViewMode; label: string; icon: string }[] = [
    { key: 'live', label: 'Live', icon: '◉' },
    { key: 'edit', label: 'Edit', icon: '✎' },
    { key: 'record', label: 'Record', icon: '●' },
    { key: 'library', label: 'Library', icon: '▦' },
    { key: 'ai', label: 'AI', icon: '◈' },
    { key: '3d', label: '3D', icon: '⬡' },
  ];

  return (
    <div className="top-bar flex items-center h-12 px-4 gap-4 flex-shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(140, 240, 225, 0.3), rgba(111, 229, 214, 0.1))',
            border: '1px solid var(--border-glow)',
            color: 'var(--accent)',
          }}>
          ✋
        </div>
        <div>
          <div className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
            ChArLI BAREHANDS
          </div>
          <div className="text-[9px] tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            STUDIO
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {views.map(view => (
          <button
            key={view.key}
            onClick={() => onViewChange(view.key)}
            className={`nav-btn ${activeView === view.key ? 'active' : ''}`}
          >
            <span className="mr-1">{view.icon}</span>
            {view.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${cameraActive ? 'live' : 'off'}`}></span>
          <span>{cameraActive ? 'TRACKING' : 'STANDBY'}</span>
        </div>
        <div className="glass-panel-sm px-2 py-0.5 text-[10px]">
          {fps > 0 ? `${fps}fps` : '—fps'}
        </div>
      </div>
    </div>
  );
}
