import { useState, useEffect } from 'react';

export function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState<Array<{ id: number; duration: number; timestamp: number }>>([]);

  useEffect(() => {
    let interval: number | undefined;
    
    if (countdown !== null && countdown > 0) {
      interval = window.setInterval(() => {
        setCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      setIsRecording(true);
      setDuration(0);
      
      const startTime = Date.now();
      const recordInterval = window.setInterval(() => {
        setDuration((Date.now() - startTime) / 1000);
      }, 100);
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        clearInterval(recordInterval);
        setIsRecording(false);
        setRecordings(prev => [...prev, {
          id: Date.now(),
          duration: (Date.now() - startTime) / 1000,
          timestamp: Date.now()
        }]);
      }, 5000);
      
      return () => clearInterval(recordInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  const handleStartRecording = () => {
    setCountdown(3);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className="glass-panel p-3">
      <div className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>
        RECORDER
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          disabled={countdown !== null}
        >
          <div className="inner"></div>
        </button>
        
        <div className="flex-1">
          {countdown !== null && countdown > 0 && (
            <div className="text-[10px]" style={{ color: 'var(--warning)' }}>
              Starting in {countdown}...
            </div>
          )}
          
          {isRecording && (
            <div className="text-[10px]" style={{ color: 'var(--danger)' }}>
              Recording: {duration.toFixed(1)}s / 5.0s
              <div className="mt-1 h-1 rounded" style={{ background: 'rgba(255, 107, 107, 0.2)' }}>
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${(duration / 5) * 100}%`,
                    background: 'var(--danger)',
                  }}
                />
              </div>
            </div>
          )}
          
          {!isRecording && countdown === null && (
            <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              Click to record gesture (5s max)
            </div>
          )}
        </div>
      </div>
      
      {recordings.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
          <div className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
            RECORDINGS ({recordings.length})
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {recordings.slice(-3).map((rec, idx) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-1.5 rounded"
                style={{ background: 'rgba(140, 240, 225, 0.05)' }}
              >
                <span className="text-[9px]" style={{ color: 'var(--text-primary)' }}>
                  #{recordings.length - idx} • {rec.duration.toFixed(1)}s
                </span>
                <button
                  className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                  style={{
                    background: 'rgba(140, 240, 225, 0.1)',
                    border: '1px solid rgba(140, 240, 225, 0.2)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ▶ Replay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
