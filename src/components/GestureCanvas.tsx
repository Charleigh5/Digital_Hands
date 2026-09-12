import React, { useRef, useEffect, RefObject, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
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

export interface GestureCanvasHandle {
  addCube: () => void;
  addSphere: () => void;
  addTorus: () => void;
  throwAllObjects: () => void;
  resetObjects: () => void;
  clearAllObjects: () => void;
}

export const GestureCanvas = forwardRef<GestureCanvasHandle, GestureCanvasProps>(function GestureCanvas({
  videoRef,
  landmarks,
  selectedGesture,
  thresholds,
  isRecording,
  cameraActive,
  trackingState,
  onCameraToggle,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownRef = useRef(false);
  const canvasSizeRef = useRef({ width: 480, height: 480 });
  
  // Three.js refs for 3D objects
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeObjectsRef = useRef<Array<{ id: string; mesh: THREE.Mesh; velocity: THREE.Vector3; grabbed: boolean }>>([]);
  const [objectCount, setObjectCount] = useState(0);
  const [show3DControls, setShow3DControls] = useState(false);
  
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

  // Initialize Three.js for 3D objects
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    threeSceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    threeCameraRef.current = camera;

    // Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      premultipliedAlpha: false
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent
    
    // Position renderer on top of canvas
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '2';
    
    container.appendChild(renderer.domElement);
    threeRendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x8ff0e4, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6fe5d6, 0.5, 10);
    pointLight.position.set(-3, 3, 3);
    scene.add(pointLight);

    // Animation loop for 3D objects
    const animate3D = () => {
      requestAnimationFrame(animate3D);

      // Update physics for 3D objects
      threeObjectsRef.current.forEach(obj => {
        if (!obj.grabbed) {
          // Apply gravity
          obj.velocity.y -= 0.01;
          obj.mesh.position.add(obj.velocity);

          // Bounce off ground
          if (obj.mesh.position.y < -2) {
            obj.mesh.position.y = -2;
            obj.velocity.y *= -0.6;
            obj.velocity.x *= 0.95;
            obj.velocity.z *= 0.95;
          }

          // Rotation based on velocity
          obj.mesh.rotation.x += obj.velocity.x * 0.1;
          obj.mesh.rotation.y += obj.velocity.y * 0.1;
        }
      });

      renderer.render(scene, camera);
    };
    animate3D();

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
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

  // 3D Object Management Functions
  const addCube = () => {
    if (!threeSceneRef.current) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8ff0e4,
      metalness: 0.5,
      roughness: 0.5,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      (Math.random() - 0.5) * 4,
      2,
      (Math.random() - 0.5) * 2
    );
    threeSceneRef.current.add(cube);

    threeObjectsRef.current.push({
      id: `cube-${Date.now()}`,
      mesh: cube,
      velocity: new THREE.Vector3(0, 0, 0),
      grabbed: false,
    });

    setObjectCount(threeObjectsRef.current.length);
  };

  const addSphere = () => {
    if (!threeSceneRef.current) return;

    const geometry = new THREE.SphereGeometry(0.6, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6fe5d6,
      metalness: 0.7,
      roughness: 0.3,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(
      (Math.random() - 0.5) * 4,
      2,
      (Math.random() - 0.5) * 2
    );
    threeSceneRef.current.add(sphere);

    threeObjectsRef.current.push({
      id: `sphere-${Date.now()}`,
      mesh: sphere,
      velocity: new THREE.Vector3(0, 0, 0),
      grabbed: false,
    });

    setObjectCount(threeObjectsRef.current.length);
  };

  const addTorus = () => {
    if (!threeSceneRef.current) return;

    const geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xffd700,
      emissiveIntensity: 0.2,
    });
    const torus = new THREE.Mesh(geometry, material);
    torus.position.set(
      (Math.random() - 0.5) * 4,
      2,
      (Math.random() - 0.5) * 2
    );
    threeSceneRef.current.add(torus);

    threeObjectsRef.current.push({
      id: `torus-${Date.now()}`,
      mesh: torus,
      velocity: new THREE.Vector3(0, 0, 0),
      grabbed: false,
    });

    setObjectCount(threeObjectsRef.current.length);
  };

  const throwAllObjects = () => {
    threeObjectsRef.current.forEach(obj => {
      obj.velocity.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.4 + 0.2,
        (Math.random() - 0.5) * 0.3
      );
    });
  };

  const resetObjects = () => {
    threeObjectsRef.current.forEach((obj, idx) => {
      obj.mesh.position.set((idx - 1) * 2, 0, 0);
      obj.velocity.set(0, 0, 0);
    });
  };

  const clearAllObjects = () => {
    if (!threeSceneRef.current) return;
    
    threeObjectsRef.current.forEach(obj => {
      threeSceneRef.current!.remove(obj.mesh);
      obj.mesh.geometry.dispose();
      (obj.mesh.material as THREE.Material).dispose();
    });
    
    threeObjectsRef.current = [];
    setObjectCount(0);
  };

  // Expose 3D object methods to parent component
  useImperativeHandle(ref, () => ({
    addCube,
    addSphere,
    addTorus,
    throwAllObjects,
    resetObjects,
    clearAllObjects,
  }));

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

      {/* 3D Objects Toggle Button */}
      <button
        onClick={() => setShow3DControls(!show3DControls)}
        className="absolute top-14 right-3 glass-panel-sm px-3 py-1.5 text-[10px] font-bold cursor-pointer hover:border-[var(--accent)] transition-all"
        style={{ 
          color: show3DControls ? 'var(--accent)' : 'var(--text-secondary)',
          borderColor: show3DControls ? 'var(--accent)' : 'rgba(140, 240, 225, 0.3)',
          background: show3DControls ? 'rgba(111, 229, 214, 0.15)' : 'rgba(52, 108, 100, 0.24)',
          zIndex: 10,
        }}
      >
        ⬡ 3D Objects {objectCount > 0 && `(${objectCount})`}
      </button>

      {/* 3D Objects Control Panel */}
      {show3DControls && (
        <div 
          className="absolute top-28 right-3 glass-panel p-3 space-y-2"
          style={{ 
            width: '200px',
            zIndex: 10,
          }}
        >
          <div className="text-[9px] font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
            ADD OBJECTS
          </div>
          
          <div className="flex flex-col gap-1.5">
            <button
              onClick={addCube}
              className="text-[10px] px-2 py-1.5 rounded cursor-pointer text-left"
              style={{
                background: 'rgba(140, 240, 225, 0.1)',
                border: '1px solid rgba(140, 240, 225, 0.3)',
                color: 'var(--text-secondary)',
              }}
            >
              ⬜ Cube
            </button>
            <button
              onClick={addSphere}
              className="text-[10px] px-2 py-1.5 rounded cursor-pointer text-left"
              style={{
                background: 'rgba(140, 240, 225, 0.1)',
                border: '1px solid rgba(140, 240, 225, 0.3)',
                color: 'var(--text-secondary)',
              }}
            >
              ⚪ Sphere
            </button>
            <button
              onClick={addTorus}
              className="text-[10px] px-2 py-1.5 rounded cursor-pointer text-left"
              style={{
                background: 'rgba(140, 240, 225, 0.1)',
                border: '1px solid rgba(140, 240, 225, 0.3)',
                color: 'var(--text-secondary)',
              }}
            >
              ⭕ Torus
            </button>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
            <div className="text-[9px] font-bold tracking-wider mb-1.5" style={{ color: 'var(--text-primary)' }}>
              ACTIONS
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={throwAllObjects}
                disabled={objectCount === 0}
                className="text-[10px] px-2 py-1.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255, 217, 61, 0.15)',
                  border: '1px solid rgba(255, 217, 61, 0.4)',
                  color: 'var(--warning)',
                }}
              >
                🚀 Throw All
              </button>
              <button
                onClick={resetObjects}
                disabled={objectCount === 0}
                className="text-[10px] px-2 py-1.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(140, 240, 225, 0.1)',
                  border: '1px solid rgba(140, 240, 225, 0.3)',
                  color: 'var(--text-secondary)',
                }}
              >
                ↻ Reset Positions
              </button>
              <button
                onClick={clearAllObjects}
                disabled={objectCount === 0}
                className="text-[10px] px-2 py-1.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255, 107, 107, 0.15)',
                  border: '1px solid rgba(255, 107, 107, 0.4)',
                  color: 'var(--danger)',
                }}
              >
                ✕ Clear All
              </button>
            </div>
          </div>

          {objectCount > 0 && (
            <div className="pt-2 border-t text-[9px]" style={{ borderColor: 'rgba(140, 240, 225, 0.2)', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> 3D objects have physics and will fall with gravity. Use gestures to interact!
            </div>
          )}
        </div>
      )}
    </div>
  );
});
