import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface MathematicalBackgroundProps {
  className?: string;
}

const MathematicalBackground: React.FC<MathematicalBackgroundProps> = ({ className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameId = useRef<number | null>(null);
  const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('medium');
  const [isVisible, setIsVisible] = useState(true);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points;
    puzzleElements: THREE.Group;
    time: number;
  } | null>(null);

  // Detect performance capabilities
  useEffect(() => {
    const checkPerformance = () => {
      // Check for slow devices
      const memoryInfo = (performance as any).memory;
      const hasLowMemory = memoryInfo && memoryInfo.jsHeapSizeLimit < 1073741824; // Less than 1GB

      // Check device pixel ratio (high DPR can indicate mobile)
      const isMobile = window.devicePixelRatio > 2 || window.innerWidth < 768;

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion || hasLowMemory) {
        setPerformanceMode('low');
      } else if (isMobile) {
        setPerformanceMode('medium');
      } else {
        setPerformanceMode('high');
      }
    };

    checkPerformance();
  }, []);

  // Visibility observer for pausing when off-screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    const currentMount = mountRef.current;

    if (currentMount) {
      observer.observe(currentMount);
    }

    return () => {
      if (currentMount) {
        observer.unobserve(currentMount);
      }
    };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: performanceMode === 'high', // Only use antialiasing in high performance mode
      powerPreference: performanceMode === 'low' ? 'low-power' : 'high-performance'
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);

    // Reduce pixel ratio on lower performance modes
    const pixelRatio = performanceMode === 'high' ? window.devicePixelRatio :
      performanceMode === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : 1;

    renderer.setPixelRatio(pixelRatio);

    mountRef.current.appendChild(renderer.domElement);

    // Scroll state
    let scrollY = 0;
    let targetScrollY = 0;
    const maxScroll = 3000;

    // Camera target positions for smooth interpolation
    const targetCameraPosition = { x: 0, y: 2, z: 20 };
    const targetLookAt = { x: 0, y: 0, z: 0 };
    const targetFOV = 75;

    // Reduce particle count based on performance mode
    const particleCount = performanceMode === 'high' ? 2000 :
      performanceMode === 'medium' ? 800 : 300;

    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Create mathematical distributions (spiral, wave patterns)
      const t = i / particleCount * Math.PI * 4;
      const r = Math.sin(t * 3) * 5 + 10;

      positions[i3] = Math.cos(t) * r + (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.sin(t * 2) * 3 + (Math.random() - 0.5) * 10;
      positions[i3 + 2] = Math.sin(t) * r + (Math.random() - 0.5) * 20;

      // Colors - mathematical gradient
      const hue = (i / particleCount) % 1;
      const color = new THREE.Color().setHSL(hue * 0.3 + 0.5, 0.8, 0.6);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: performanceMode !== 'low', // Disable vertex colors in low mode
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);

    scene.add(particleSystem);

    // Only add puzzle elements in medium/high performance modes
    const puzzleElements3D = new THREE.Group();

    if (performanceMode !== 'low') {
      const puzzleElements = ['↑ ↓ ← →', '◯ → ◎', '▢ ■ ▣', '⬆ ⬇ ⬅ ➡', '🎯'];
      const elementCount = performanceMode === 'high' ? puzzleElements.length : 3;

      puzzleElements.slice(0, elementCount).forEach((text, index) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = 128; // Reduced from 256
        canvas.height = 32; // Reduced from 64

        context.font = '16px Arial'; // Reduced from 24px
        context.fillStyle = `hsl(${200 + index * 20}, 70%, 80%)`;
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0.7
        });
        const sprite = new THREE.Sprite(material);

        const angle = (index / elementCount) * Math.PI * 2;

        sprite.position.set(
          Math.cos(angle) * 15,
          (Math.random() - 0.5) * 10,
          Math.sin(angle) * 15
        );
        sprite.scale.set(4, 1, 1);

        (sprite as any).initialPosition = sprite.position.clone();
        (sprite as any).animationOffset = index;

        puzzleElements3D.add(sprite);
      });

      scene.add(puzzleElements3D);
    }

    // Only add geometric shapes in high performance mode
    if (performanceMode === 'high') {
      const geometries = [
        new THREE.TetrahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(1, 0),
      ];

      geometries.forEach((geometry, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(index * 0.5, 0.8, 0.5),
          wireframe: true,
          transparent: true,
          opacity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set((index - 0.5) * 8, 0, -10);

        (mesh as any).rotationSpeed = {
          x: 0.01,
          y: 0.01,
          z: 0.01
        };

        scene.add(mesh);
      });
    }

    // Initial camera position
    camera.position.z = 20;
    camera.position.y = 2;

    // Store scene references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      particles: particleSystem,
      puzzleElements: puzzleElements3D,
      time: 0
    };

    // Throttled scroll handler
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        targetScrollY = window.scrollY;
      }, 50); // Throttle scroll events
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const lerp = (start: number, end: number, factor: number): number => {
      return start + (end - start) * factor;
    };

    // Track frame timing for performance throttling
    let lastFrameTime = 0;
    const targetFPS = performanceMode === 'high' ? 60 :
      performanceMode === 'medium' ? 30 : 20;
    const frameInterval = 1000 / targetFPS;

    // Track update cycles to reduce expensive operations
    let updateCycle = 0;

    // Animation loop
    const animate = (currentTime: number) => {
      if (!sceneRef.current) return;

      // Pause animation when not visible
      if (!isVisible) {
        frameId.current = requestAnimationFrame(animate);

        return;
      }

      // Throttle animation based on performance mode
      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime < frameInterval) {
        frameId.current = requestAnimationFrame(animate);

        return;
      }

      lastFrameTime = currentTime - (deltaTime % frameInterval);

      const { scene, camera, renderer, particles, puzzleElements } = sceneRef.current;

      sceneRef.current.time += 0.01;
      const time = sceneRef.current.time;

      updateCycle++;

      // Smooth scroll interpolation (less frequent in low performance)
      const scrollLerpFactor = performanceMode === 'low' ? 0.01 : 0.03;

      scrollY = lerp(scrollY, targetScrollY, scrollLerpFactor);

      const scrollProgress = Math.min(scrollY / maxScroll, 1);

      // Only update particle positions every N frames in lower performance modes
      const shouldUpdateParticles = performanceMode === 'high' ||
                                   (performanceMode === 'medium' && updateCycle % 2 === 0) ||
                                   (performanceMode === 'low' && updateCycle % 4 === 0);

      if (shouldUpdateParticles && performanceMode !== 'low') {
        const positions = particles.geometry.attributes.position.array as Float32Array;

        // Update fewer particles in medium mode
        const step = performanceMode === 'high' ? 3 : 9;

        for (let i = 0; i < positions.length; i += step) {
          positions[i + 1] += Math.sin(time + positions[i] * 0.1) * 0.01;
        }

        particles.geometry.attributes.position.needsUpdate = true;
      }

      // Simple rotation for particle system
      particles.rotation.y = time * 0.1;

      // Only animate other elements in non-low modes
      if (performanceMode !== 'low') {
        particles.rotation.x = Math.sin(time * 0.3) * 0.2;

        // Animate puzzle elements (reduced frequency)
        if (updateCycle % 2 === 0) {
          puzzleElements.children.forEach((sprite) => {
            const s = sprite as any;

            sprite.position.copy(s.initialPosition);
            sprite.position.y += Math.sin(time + s.animationOffset) * 2;
          });
        }

        // Animate geometric shapes
        if (performanceMode === 'high') {
          scene.children.forEach(child => {
            if (child instanceof THREE.Mesh && (child as any).rotationSpeed) {
              const speed = (child as any).rotationSpeed;

              child.rotation.x += speed.x;
              child.rotation.y += speed.y;
              child.rotation.z += speed.z;
            }
          });
        }
      }

      // Simplified camera movement
      camera.position.x = Math.sin(time * 0.2) * 2;
      camera.position.y = 2 + scrollProgress * 3;
      camera.position.z = 20 - scrollProgress * 5;

      camera.lookAt(0, scrollProgress * 1.5, 0);

      renderer.render(scene, camera);
      frameId.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Handle resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!sceneRef.current) return;

        const { camera, renderer } = sceneRef.current;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);

      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }

      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        sceneRef.current.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();

            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        sceneRef.current.scene.clear();
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [performanceMode, isVisible]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
};

export default MathematicalBackground;
