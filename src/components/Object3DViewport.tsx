export function Object3DViewport() {
  return (
    <div className="glass-panel h-full flex items-center justify-center">
      <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="text-4xl mb-2">⬡</div>
        <div className="text-sm font-bold">3D Objects</div>
        <div className="text-xs mt-1">Interactive 3D object manipulation</div>
      </div>
    </div>
  );
}
