import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface TrackedHand {
  landmarks: { x: number; y: number; z: number }[];
  handedness: 'Left' | 'Right';
}

export interface HandTrackingState {
  isActive: boolean;
  isInitializing: boolean;
  error: string | null;
  hands: TrackedHand[];
  fps: number;
}

const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

export function useHandTracking() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });

  const [state, setState] = useState<HandTrackingState>({
    isActive: false,
    isInitializing: false,
    error: null,
    hands: [],
    fps: 0,
  });

  const onLandmarksRef = useRef<((hands: TrackedHand[]) => void) | null>(null);

  const setOnLandmarks = useCallback((cb: (hands: TrackedHand[]) => void) => {
    onLandmarksRef.current = cb;
  }, []);

  const initLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'GPU',
        },
        numHands: 2,
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.7,
        minHandPresenceConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      return landmarker;
    } catch (err) {
      console.error('[HandTracking] Failed to initialize landmarker:', err);
      throw err;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (!window.isSecureContext) {
      throw { type: 'no_secure_context', message: 'Camera requires HTTPS or localhost' };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw { type: 'no_device', message: 'Camera API not available' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          } else {
            resolve();
          }
        });
        await videoRef.current.play();
      }
      return stream;
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError') {
        throw { type: 'permission_denied', message: 'Camera permission denied' };
      }
      if (name === 'NotFoundError') {
        throw { type: 'no_device', message: 'No camera found' };
      }
      throw { type: 'unknown', message: err?.message || 'Camera error' };
    }
  }, []);

  const detectionLoop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectionLoop);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);

        fpsCounterRef.current.frames++;
        if (now - fpsCounterRef.current.lastTime >= 1000) {
          fpsCounterRef.current.fps = fpsCounterRef.current.frames;
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = now;
          setState(prev => ({ ...prev, fps: fpsCounterRef.current.fps }));
        }

        const hands: TrackedHand[] = [];
        if (result.landmarks && result.landmarks.length > 0) {
          result.landmarks.forEach((lms: any[], i: number) => {
            const handednessArr = result.handedness?.[i];
            const handedness: 'Left' | 'Right' = 
              (Array.isArray(handednessArr) && handednessArr[0]?.categoryName as 'Left' | 'Right') ||
              (i === 0 ? 'Right' : 'Left');
            hands.push({
              landmarks: lms.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z || 0 })),
              handedness,
            });
          });
        }

        setState(prev => ({ ...prev, hands }));
        if (onLandmarksRef.current) {
          onLandmarksRef.current(hands);
        }
      } catch (err) {
        console.error('[HandTracking] Detection error:', err);
      }
    }

    animFrameRef.current = requestAnimationFrame(detectionLoop);
  }, []);

  const enable = useCallback(async () => {
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      await initLandmarker();
      await startCamera();

      setState(prev => ({
        ...prev,
        isActive: true,
        isInitializing: false,
        error: null,
      }));

      animFrameRef.current = requestAnimationFrame(detectionLoop);
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isActive: false,
        isInitializing: false,
        error: err?.message || 'Failed to start camera',
      }));
    }
  }, [initLandmarker, startCamera, detectionLoop]);

  const disable = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      isInitializing: false,
      hands: [],
      fps: 0,
      error: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    state,
    enable,
    disable,
    setOnLandmarks,
  };
}
