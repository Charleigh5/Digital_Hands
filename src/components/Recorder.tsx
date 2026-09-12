export function Recorder() {
  return (
    <div className="glass-panel p-3">
      <div className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>
        RECORDER
      </div>
      <div className="flex items-center gap-3">
        <button className="record-btn">
          <div className="inner"></div>
        </button>
        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Click to record gesture
        </div>
      </div>
    </div>
  );
}
