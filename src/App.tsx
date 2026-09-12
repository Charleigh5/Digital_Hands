import { useState, useCallback, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { GestureCanvas } from './components/GestureCanvas';
import { GestureLibrary } from './components/GestureLibrary';
import { ThresholdPanel } from './components/ThresholdPanel';
import { CodeEditor } from './components/CodeEditor';
import { AIChat } from './components/AIChat';
import { LivePreview } from './components/LivePreview';
import { Recorder } from './components/Recorder';
import { DEFAULT_THRESHOLDS, BUILT_IN_GESTURES, GestureDefinition } from './engine/gestures-defaults';
import { GestureConfig } from './engine/gesture-engine';
import { useHandTracking, TrackedHand } from './hooks/useHandTracking';

type ViewMode = 'live' | 'edit' | 'record' | 'library' | 'ai' | '3d';

function App() {
  const [activeView, setActiveView] = useState<ViewMode>('live');
  const [selectedGesture, setSelectedGesture] = useState<GestureDefinition>(BUILT_IN_GESTURES[0]);
  const [thresholds, setThresholds] = useState<GestureConfig>(DEFAULT_THRESHOLDS);
  const [liveLandmarks, setLiveLandmarks] = useState<{ x: number; y: number; z: number }[][] | null>(null);
  const [trackedHands, setTrackedHands] = useState<TrackedHand[]>([]);

  const {
    videoRef,
    state: trackingState,
    enable: enableTracking,
    disable: disableTracking,
    setOnLandmarks,
  } = useHandTracking();

  const cameraActive = trackingState.isActive;

  useEffect(() => {
    setOnLandmarks((hands: TrackedHand[]) => {
      setTrackedHands(hands);
      if (hands.length > 0) {
        setLiveLandmarks(hands.map(h => h.landmarks));
      } else {
        setLiveLandmarks(null);
      }
    });
  }, [setOnLandmarks]);

  const handleCameraToggle = useCallback(async () => {
    if (cameraActive) {
      disableTracking();
    } else {
      await enableTracking();
    }
  }, [cameraActive, enableTracking, disableTracking]);

  const handleThresholdChange = useCallback((category: string, key: string, value: number) => {
    setThresholds(prev => ({
      ...prev,
      [category]: {
        ...(prev as any)[category],
        [key]: value,
      },
    }));
  }, []);

  const handleGestureSelect = useCallback((gesture: GestureDefinition) => {
    setSelectedGesture(gesture);
  }, []);

  const renderCenterContent = () => {
    switch (activeView) {
      case 'record':
        return (
          <div className="flex flex-col gap-3 h-full">
            <GestureCanvas
              videoRef={videoRef}
              landmarks={liveLandmarks}
              selectedGesture={selectedGesture}
              thresholds={thresholds}
              isRecording={false}
              cameraActive={cameraActive}
              trackingState={trackingState}
              onCameraToggle={handleCameraToggle}
            />
            <Recorder />
          </div>
        );
      default:
        return (
          <GestureCanvas
            videoRef={videoRef}
            landmarks={liveLandmarks}
            selectedGesture={selectedGesture}
            thresholds={thresholds}
            isRecording={false}
            cameraActive={cameraActive}
            trackingState={trackingState}
            onCameraToggle={handleCameraToggle}
          />
        );
    }
  };

  const renderRightPanel = () => {
    switch (activeView) {
      case 'edit':
        return <CodeEditor />;
      case 'ai':
        return <AIChat />;
      case '3d':
        return (
          <div className="glass-panel h-full flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
              <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
                3D OBJECTS
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(111, 229, 214, 0.15)', color: 'var(--accent)' }}>
                ✓ Integrated
              </span>
            </div>
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">⬡</div>
              <div className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                3D Objects Integrated
              </div>
              <div className="text-[11px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                3D objects are now rendered directly in the main camera viewport alongside hand tracking.
              </div>
              <div className="glass-panel-sm p-3 text-left text-[10px] space-y-2" style={{ color: 'var(--text-secondary)' }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>How to use:</strong></div>
                <div>1. Click the <span style={{ color: 'var(--accent)' }}>⬡ 3D Objects</span> button in the main viewport</div>
                <div>2. Add cubes, spheres, or torus objects</div>
                <div>3. Objects have physics and fall with gravity</div>
                <div>4. Use "Throw All" to launch objects</div>
                <div>5. Objects render on top of your camera feed</div>
              </div>
            </div>
          </div>
        );
      case 'library':
        return <LivePreview />;
      default:
        return <LivePreview />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      <TopBar
        activeView={activeView}
        onViewChange={setActiveView}
        cameraActive={cameraActive}
        fps={trackingState.fps}
      />

      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        <div className="w-64 flex-shrink-0 overflow-hidden flex flex-col">
          <GestureLibrary
            gestures={BUILT_IN_GESTURES}
            selectedGesture={selectedGesture}
            onSelect={handleGestureSelect}
          />
        </div>

        <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0">
            {renderCenterContent()}
          </div>
          <div className="flex-shrink-0">
            <ThresholdPanel
              thresholds={thresholds}
              onChange={handleThresholdChange}
              selectedGesture={selectedGesture}
            />
          </div>
        </div>

        <div className="w-96 flex-shrink-0 overflow-hidden">
          {renderRightPanel()}
        </div>
      </div>

      <div className="h-7 flex items-center px-4 gap-4 text-xs border-t"
        style={{
          background: 'rgba(2, 15, 12, 0.9)',
          borderColor: 'rgba(140, 240, 225, 0.2)',
          color: 'var(--text-secondary)',
        }}>
        <span className="flex items-center gap-1.5">
          <span className={`status-dot ${cameraActive ? 'live' : 'off'}`}></span>
          {cameraActive ? `Camera Active · ${trackingState.fps}fps` : 'Camera Off'}
        </span>
        <span>|</span>
        <span>Gesture: {selectedGesture.name}</span>
        <span>|</span>
        <span>Hands: {liveLandmarks ? liveLandmarks.length : 0}</span>
        <span className="ml-auto">ChArLI Barehands Studio v1.0</span>
      </div>
    </div>
  );
}

export default App;
