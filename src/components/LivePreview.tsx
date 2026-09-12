export function LivePreview() {
  return (
    <div className="glass-panel h-full flex items-center justify-center">
      <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="text-4xl mb-2">◉</div>
        <div className="text-sm font-bold">Stage Preview</div>
        <div className="text-xs mt-1">Live preview of gesture interactions</div>
      </div>
    </div>
  );
}
