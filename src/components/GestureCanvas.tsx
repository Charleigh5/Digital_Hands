import React, { useRef, useEffect, RefObject } from 'react';
import { GestureDefinition, BONE_CONNECTIONS } from '../engine/gestures-defaults';
import { GestureConfig, toScreen, landmarkUtils } from '../engine/gesture-engine';
import { HandTrackingState } from '../hooks/useHandTracking';
import { GestureStateMachine } from '../engine/gesture-state-machine';
import { PredictiveGestureDetector } from '../engine/predictive-gesture';
import { AdaptiveCalibration } from '../engine/adaptive-calibration';
import { ConfidenceVisualizer } from '../engine/confidence-visualizer';
import { LandmarkCache, TransformationCache } from '../engine/performance-cache';

interface GestureCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: { x: number; y: number; z: number }[][] | null;
  selectedGesture: GestureDefinition;
  thresholds: GestureConfig;
  isRecording: boolean;
  cameraActive: boolean;
  trackingState: HandTrackingState;
  onCameraToggle: () => void;
}

export function GestureCanvas({
  videoRef,
  landmarks,
  selectedGesture,
  thresholds,
  isRecording,
  cameraActive,
  trackingState,
  onCameraToggle,
}: GestureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownRef = useRef(false);
  const canvasSizeRef = useRef({ width: 480, height: 480 });
  
  // New optimization systems
  const stateMachineRef = useRef<GestureStateMachine>(new GestureStateMachine());
  const predictorRef = useRef<PredictiveGestureDetector>(new PredictiveGestureDetector());
  const calibratorRef = useRef<AdaptiveCalibration>(new AdaptiveCalibration());
  const visualizerRef = useRef<ConfidenceVisualizer>(new ConfidenceVisualizer());
  const landmarkCacheRef = useRef<LandmarkCache>(new LandmarkCache());
  const transformCacheRef = useRef<TransformationCache>(new TransformationCache());
  const calibrationCompleteRef = useRef(false);

  // Resize canvas to fill container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      canvasSizeRef.current = { width, height };
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Mouse tracking for demo mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseDown = () => { mouseDownRef.current = true; };
    const handleMouseUp = () => { mouseDownRef.current = false; };
    const handleMouseLeave = () => { mousePosRef.current = null; };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const width = canvasSizeRef.current.width;
      const height = canvasSizeRef.current.height;

      ctx.clearRect(0, 0, width, height);

      // Draw video feed if camera is active
      if (cameraActive && videoRef.current) {
        const video = videoRef.current;
        
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          
          const vAspect = video.videoWidth / video.videoHeight;
          const cAspect = width / height;
          let drawW: number, drawH: number, drawX: number, drawY: number;
          
          if (vAspect > cAspect) {
            drawH = height;
            drawW = height * vAspect;
            drawX = (width - drawW) / 2;
            drawY = 0;
          } else {
            drawW = width;
            drawH = width / vAspect;
            drawX = 0;
            drawY = (height - drawH) / 2;
          }
          
          ctx.globalAlpha = 0.85;
          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          ctx.globalAlpha = 1;
          ctx.restore();

          ctx.fillStyle = 'rgba(2, 15, 12, 0.3)';
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = 'rgba(2, 15, 12, 0.95)';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = 'rgba(140, 240, 225, 0.6)';
          ctx.font = '14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Initializing camera...', width / 2, height / 2);
          ctx.textAlign = 'left';
        }
      } else {
        // Demo background
        ctx.fillStyle = 'rgba(2, 15, 12, 0.95)';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(140, 240, 225, 0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }
        for (let i = 0; i < height; i += 30) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
          ctx.stroke();
        }

        // Draw demo hand
        if (!landmarks || landmarks.length === 0) {
          drawDemoHand(ctx, width, height, time);
        }
      }

      // Draw tracked hands
      if (landmarks && landmarks.length > 0) {
        // Invalidate caches for new frame
        landmarkCacheRef.current.invalidateLandmarks();
        
        landmarks.forEach((handLm, handIdx) => {
          drawHandSkeleton(ctx, handLm, width, height, handIdx);
        });
      }

      // Recording indicator
      if (isRecording) {
        ctx.fillStyle = 'rgba(255, 107, 107, 0.9)';
        ctx.beginPath();
        ctx.arc(width - 20, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('REC', width - 45, 24);
      }

      // Gesture name
      ctx.fillStyle = 'rgba(140, 240, 225, 0.7)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`▸ ${selectedGesture.name}`, 12, 20);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [landmarks, selectedGesture, isRecording, cameraActive, videoRef]);

  const drawDemoHand = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const mouse = mousePosRef.current;
    const isMouseDown = mouseDownRef.current;
    
    const baseX = mouse ? mouse.x / w : 0.5;
    const baseY = mouse ? mouse.y / h : 0.5;
    
    const wave = Math.sin(time * 0.002) * 0.01;
    const breathe = Math.sin(time * 0.001) * 0.005;
    const pinchFactor = isMouseDown ? 0.7 : 1.0;

    const demoLandmarks: { x: number; y: number; z: number }[] = [
      { x: baseX, y: baseY + 0.15, z: 0 },
      { x: baseX - 0.08, y: baseY + 0.10, z: 0.02 },
      { x: baseX - 0.12, y: baseY + 0.05, z: 0.03 },
      { x: baseX - 0.14, y: baseY - 0.02, z: 0.02 },
      { x: baseX - 0.12 + wave, y: baseY - 0.08, z: 0.01 },
      { x: baseX - 0.04, y: baseY + 0.02, z: 0 },
      { x: baseX - 0.05, y: baseY - 0.06, z: -0.01 },
      { x: baseX - 0.05, y: baseY - 0.12, z: -0.02 },
      { x: baseX - 0.05 + wave * 0.5, y: baseY - 0.18 * pinchFactor + breathe, z: -0.01 },
      { x: baseX, y: baseY, z: 0 },
      { x: baseX, y: baseY - 0.08, z: -0.01 },
      { x: baseX, y: baseY - 0.15, z: -0.02 },
      { x: baseX + wave * 0.3, y: baseY - 0.22 * pinchFactor + breathe, z: -0.01 },
      { x: baseX + 0.04, y: baseY + 0.01, z: 0 },
      { x: baseX + 0.05, y: baseY - 0.06, z: -0.01 },
      { x: baseX + 0.05, y: baseY - 0.12, z: -0.02 },
      { x: baseX + 0.05 - wave * 0.3, y: baseY - 0.18 * pinchFactor + breathe, z: -0.01 },
      { x: baseX + 0.08, y: baseY + 0.03, z: 0.01 },
      { x: baseX + 0.10, y: baseY - 0.03, z: 0 },
      { x: baseX + 0.10, y: baseY - 0.08, z: -0.01 },
      { x: baseX + 0.10 - wave * 0.5, y: baseY - 0.13 * pinchFactor + breathe, z: 0 },
    ];

    BONE_CONNECTIONS.forEach((conn: number[]) => {
      const a = conn[0];
      const b = conn[1];
      const pA = toScreen(demoLandmarks[a], w, h);
      const pB = toScreen(demoLandmarks[b], w, h);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.strokeStyle = 'rgba(140, 240, 225, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    demoLandmarks.forEach((lm, i) => {
      const p = toScreen(lm, w, h);
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const r = isTip ? 4 : 2.5;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      grad.addColorStop(0, 'rgba(140, 240, 225, 0.25)');
      grad.addColorStop(1, 'rgba(140, 240, 225, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isTip ? '#6fe5d6' : '#8ff0e4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(140, 240, 225, 0.35)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOVE MOUSE OVER CANVAS TO CONTROL HAND', w / 2, h - 38);
    ctx.fillStyle = 'rgba(140, 240, 225, 0.25)';
    ctx.font = '10px monospace';
    ctx.fillText('CLICK TO PINCH · Enable camera for live tracking', w / 2, h - 22);
    ctx.textAlign = 'left';
  };

  const drawHandSkeleton = (
    ctx: CanvasRenderingContext2D,
    lm: { x: number; y: number; z: number }[],
    w: number,
    h: number,
    handIdx: number
  ) => {
    const handColor = handIdx === 0
      ? { bone: 'rgba(111, 229, 214, 0.7)', tip: '#6fe5d6', point: '#8ff0e4' }
      : { bone: 'rgba(180, 140, 255, 0.7)', tip: '#b48cff', point: '#d4b8ff' };

    const videoWidth = videoRef.current?.videoWidth || 1280;
    const videoHeight = videoRef.current?.videoHeight || 720;

    // Use cached transformation
    const transformLandmark = (point: { x: number; y: number; z: number }) => {
      return transformCacheRef.current.getCoverFit(videoWidth, videoHeight, w, h);
    };

    const coverFit = transformCacheRef.current.getCoverFit(videoWidth, videoHeight, w, h);
    const transformPoint = (point: { x: number; y: number; z: number }) => ({
      x: coverFit.drawX + (1 - point.x) * coverFit.drawW,
      y: coverFit.drawY + point.y * coverFit.drawH,
    });

    // Adaptive calibration (first 3 seconds)
    if (!calibrationCompleteRef.current && handIdx === 0) {
      const calData = calibratorRef.current.calibrate(lm);
      if (calData) {
        calibrationCompleteRef.current = true;
        const calibrated = calibratorRef.current.getCalibratedThresholds();
        if (calibrated) {
          stateMachineRef.current.setConfig({
            enterThreshold: calibrated.pinchEnter,
            exitThreshold: calibrated.pinchExit,
          });
        }
      }
    }

    // Calculate pinch ratio using cached distances
    const pinchDistance = landmarkCacheRef.current.getDistance(lm, 4, 8);
    const palmWidth = landmarkCacheRef.current.getDistance(lm, 0, 9);
    const pinchRatio = palmWidth > 0 ? pinchDistance / palmWidth : 1;

    // Update state machine with pinch ratio
    const state = stateMachineRef.current.update(pinchRatio);
    
    // Get prediction
    const prediction = predictorRef.current.predict(
      pinchRatio,
      thresholds.pinch.ratio_enter_frontal
    );

    // Calculate stability using cached values
    const bbox = landmarkCacheRef.current.getBoundingBox(lm);
    const aspectRatio = landmarkCacheRef.current.getAspectRatio(lm);
    const stability = state.stability;

    // Draw bones
    BONE_CONNECTIONS.forEach((conn: number[]) => {
      const a = conn[0];
      const b = conn[1];
      const pA = transformPoint(lm[a]);
      const pB = transformPoint(lm[b]);

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      
      // Color based on gesture phase
      let boneColor = handColor.bone;
      if (state.phase === 'active') {
        boneColor = 'rgba(111, 229, 214, 1)';
      } else if (state.phase === 'approaching') {
        boneColor = `rgba(111, 229, 214, ${0.5 + state.confidence * 0.5})`;
      }
      
      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // Draw landmarks
    lm.forEach((point, i) => {
      const p = transformPoint(point);
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const radius = isTip ? 5 : 3;

      ctx.fillStyle = isTip ? handColor.tip : handColor.point;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw confidence visualization for first hand
    if (handIdx === 0) {
      const pinchPoint = landmarkCacheRef.current.getMidpoint(lm, 4, 8);
      const pinchScreen = transformPoint(pinchPoint);
      
      visualizerRef.current.drawHUD(
        ctx,
        pinchScreen.x,
        pinchScreen.y,
        state.confidence,
        state.phase,
        prediction.timeToTrigger,
        prediction.velocity,
        stability
      );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ minHeight: '400px' }}>
      <canvas
        ref={canvasRef}
        className="gesture-canvas"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: cameraActive ? 'none' : 'crosshair'
        }}
      />

      <button
        onClick={onCameraToggle}
        className={`camera-toggle-btn ${cameraActive ? 'active' : 'inactive'}`}
        title={cameraActive ? 'Disable Camera' : 'Enable Camera'}
        disabled={trackingState.isInitializing}
      >
        <span className="camera-toggle-icon">
          {trackingState.isInitializing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : cameraActive ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              <line x1="1" y1="1" x2="23" y2="23" opacity="0.6"/>
            </svg>
          )}
        </span>
        <span className="camera-toggle-label">
          {trackingState.isInitializing ? 'Loading...' : cameraActive ? 'Camera ON' : 'Enable Camera'}
        </span>
        {!cameraActive && !trackingState.isInitializing && <span className="camera-toggle-pulse"></span>}
      </button>
    </div>
  );
}
