import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Object3D {
  id: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  grabbed: boolean;
}

export function Object3DViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsRef = useRef<Object3D[]>([]);
  const [objectCount, setObjectCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020f0c);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x8ff0e4, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x8ff0e4, 0x333333);
    gridHelper.position.y = -2;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Add initial objects
    addCube();
    addSphere();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update physics
      objectsRef.current.forEach(obj => {
        if (!obj.grabbed) {
          // Apply gravity
          obj.velocity.y -= 0.01;
          obj.mesh.position.add(obj.velocity);

          // Bounce off ground
          if (obj.mesh.position.y < -1.5) {
            obj.mesh.position.y = -1.5;
            obj.velocity.y *= -0.6;
            obj.velocity.x *= 0.95;
            obj.velocity.z *= 0.95;
          }

          // Rotation
          obj.mesh.rotation.x += obj.velocity.x * 0.1;
          obj.mesh.rotation.y += obj.velocity.y * 0.1;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const addCube = () => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8ff0e4,
      metalness: 0.5,
      roughness: 0.5,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(-2, 0, 0);
    sceneRef.current.add(cube);

    objectsRef.current.push({
      id: `cube-${Date.now()}`,
      mesh: cube,
      velocity: new THREE.Vector3(0, 0, 0),
      grabbed: false,
    });

    setObjectCount(objectsRef.current.length);
  };

  const addSphere = () => {
    if (!sceneRef.current) return;

    const geometry = new THREE.SphereGeometry(0.6, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6fe5d6,
      metalness: 0.7,
      roughness: 0.3,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(2, 0, 0);
    sceneRef.current.add(sphere);

    objectsRef.current.push({
      id: `sphere-${Date.now()}`,
      mesh: sphere,
      velocity: new THREE.Vector3(0, 0, 0),
      grabbed: false,
    });

    setObjectCount(objectsRef.current.length);
  };

  const addTorus = () => {
    if (!sceneRef.current) return;

    const geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xffd700,
      emissiveIntensity: 0.2,
    });
    const torus = new THREE.Mesh(geometry, material);
    torus.position.set(0, 2, 0);
    sceneRef.current.add(torus);

    objectsRef.current.push({
      id: `torus-${Date.now()}`,
      mesh: torus,
      velocity: new THREE.Vector3(0, 0, 0),
      grabbed: false,
    });

    setObjectCount(objectsRef.current.length);
  };

  const throwAll = () => {
    objectsRef.current.forEach(obj => {
      obj.velocity.set(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.3 + 0.2,
        (Math.random() - 0.5) * 0.2
      );
    });
  };

  const resetPositions = () => {
    objectsRef.current.forEach((obj, idx) => {
      obj.mesh.position.set((idx - 1) * 2, 0, 0);
      obj.velocity.set(0, 0, 0);
    });
  };

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          3D OBJECTS
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(140, 240, 225, 0.15)', color: 'var(--text-secondary)' }}>
          {objectCount} objects
        </span>
      </div>

      <div ref={containerRef} className="flex-1 relative" style={{ minHeight: '300px' }}>
        {/* Instructions overlay */}
        <div
          className="absolute top-3 left-3 right-3 p-2 rounded"
          style={{
            background: 'rgba(2, 15, 12, 0.8)',
            border: '1px solid rgba(140, 240, 225, 0.2)',
            zIndex: 10,
          }}
        >
          <div className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>3D Viewport:</strong> Objects have physics and respond to gestures.
            Pinch to grab, move to reposition, release to drop.
          </div>
        </div>
      </div>

      <div className="p-3 border-t space-y-2" style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <div className="text-[9px] font-bold" style={{ color: 'var(--text-secondary)' }}>
          ADD OBJECTS
        </div>
        <div className="flex gap-2">
          <button
            onClick={addCube}
            className="flex-1 text-[10px] px-2 py-1.5 rounded cursor-pointer"
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
            className="flex-1 text-[10px] px-2 py-1.5 rounded cursor-pointer"
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
            className="flex-1 text-[10px] px-2 py-1.5 rounded cursor-pointer"
            style={{
              background: 'rgba(140, 240, 225, 0.1)',
              border: '1px solid rgba(140, 240, 225, 0.3)',
              color: 'var(--text-secondary)',
            }}
          >
            ⭕ Torus
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={throwAll}
            className="flex-1 text-[10px] px-2 py-1.5 rounded cursor-pointer"
            style={{
              background: 'rgba(255, 217, 61, 0.15)',
              border: '1px solid rgba(255, 217, 61, 0.4)',
              color: 'var(--warning)',
            }}
          >
            🚀 Throw All
          </button>
          <button
            onClick={resetPositions}
            className="flex-1 text-[10px] px-2 py-1.5 rounded cursor-pointer"
            style={{
              background: 'rgba(140, 240, 225, 0.1)',
              border: '1px solid rgba(140, 240, 225, 0.3)',
              color: 'var(--text-secondary)',
            }}
          >
            ↻ Reset
          </button>
        </div>
      </div>
    </div>
  );
}
