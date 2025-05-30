import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MathematicalBackgroundProps {
  className?: string;
}

const MathematicalBackground: React.FC<MathematicalBackgroundProps> = ({ className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameId = useRef<number | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points;
    puzzleElements: THREE.Group;
    time: number;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    mountRef.current.appendChild(renderer.domElement);

    // Scroll state
    let scrollY = 0;
    let targetScrollY = 0;
    const maxScroll = 3000; // Adjust based on your page height

    // Camera target positions for smooth interpolation
    const targetCameraPosition = { x: 0, y: 2, z: 20 };
    const targetLookAt = { x: 0, y: 0, z: 0 };
    let targetFOV = 75;

    // Create particle system for mathematical patterns
    const particleCount = 2000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Create mathematical distributions (spiral, wave patterns)
      const t = i / particleCount * Math.PI * 4;
      const r = Math.sin(t * 3) * 5 + 10;

      positions[i3] = Math.cos(t) * r + (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.sin(t * 2) * 3 + (Math.random() - 0.5) * 10;
      positions[i3 + 2] = Math.sin(t) * r + (Math.random() - 0.5) * 20;

      // Velocity for animation
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      // Colors - mathematical gradient
      const hue = (i / particleCount + Math.sin(t)) % 1;
      const color = new THREE.Color().setHSL(hue * 0.3 + 0.5, 0.8, 0.6);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);

    scene.add(particleSystem);

    // Create puzzle game elements as text textures
    const puzzleElements3D = new THREE.Group();
    const puzzleElements = [
      '↑ ↓ ← →',
      '◯ → ◎',
      '▢ ■ ▣',
      '⬆ ⬇ ⬅ ➡',
      '🎯',
      '⊞ ⊟ ⊠',
      '╬ ╫ ╪',
      '⟐ ⟐ ⟐',
      '◈ ◉ ○',
      '⚹ ⚺ ⚻'
    ];

    puzzleElements.forEach((text, index) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.width = 256;
      canvas.height = 64;

      context.fillStyle = 'rgba(255, 255, 255, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = '24px Arial';
      context.fillStyle = `hsl(${200 + index * 20}, 70%, 80%)`;
      context.textAlign = 'center';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7
      });
      const sprite = new THREE.Sprite(material);

      // Position puzzle elements in 3D space
      const angle = (index / puzzleElements.length) * Math.PI * 2;

      sprite.position.set(
        Math.cos(angle) * 15,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * 15
      );
      sprite.scale.set(4, 1, 1);

      // Store initial position for animation
      (sprite as any).initialPosition = sprite.position.clone();
      (sprite as any).animationOffset = index;

      puzzleElements3D.add(sprite);
    });

    scene.add(puzzleElements3D);

    // Create geometric shapes with mathematical properties
    const geometries = [
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.DodecahedronGeometry(1, 0),
    ];

    geometries.forEach((geometry, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(index * 0.25, 0.8, 0.5),
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });

      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        (index - 1.5) * 8,
        Math.sin(index) * 3,
        -10
      );

      // Store for animation
      (mesh as any).rotationSpeed = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      };

      scene.add(mesh);
    });

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

    // Scroll event listener
    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Easing function for smooth transitions
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const lerp = (start: number, end: number, factor: number): number => {
      return start + (end - start) * factor;
    };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;

      const { scene, camera, renderer, particles, puzzleElements } = sceneRef.current;

      sceneRef.current.time += 0.01;
      const time = sceneRef.current.time;

      // Smooth scroll interpolation
      const scrollLerpFactor = 0.03; // Reduced from 0.08 - much slower scroll response

      scrollY = lerp(scrollY, targetScrollY, scrollLerpFactor);

      // Calculate scroll-based camera adjustments with easing
      const scrollProgress = Math.min(scrollY / maxScroll, 1);
      const easedScrollProgress = easeOutCubic(scrollProgress);
      const scrollSin = Math.sin(easedScrollProgress * Math.PI);

      // Animate particles
      const positions = particles.geometry.attributes.position.array as Float32Array;
      const colors = particles.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        // Wave motion
        positions[i + 1] += Math.sin(time + positions[i] * 0.1) * 0.01;

        // Color animation
        const colorIndex = i / 3;
        const hue = (colorIndex / 1000 + time * 0.1) % 1;
        const color = new THREE.Color().setHSL(hue * 0.3 + 0.5, 0.8, 0.6);

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.color.needsUpdate = true;

      // Rotate particle system with smooth scroll influence
      particles.rotation.y = time * 0.1 + easedScrollProgress * 0.2; // Reduced from 0.3
      particles.rotation.x = Math.sin(time * 0.3) * 0.2 + scrollSin * 0.1; // Reduced from 0.15

      // Animate puzzle elements
      puzzleElements.children.forEach((sprite, index) => {
        const s = sprite as any;

        sprite.position.copy(s.initialPosition);
        sprite.position.y += Math.sin(time + s.animationOffset) * 2;
        sprite.position.x += Math.cos(time * 0.5 + s.animationOffset) * 1;

        // Smooth scroll-based depth movement
        sprite.position.z += scrollSin * 1; // Reduced from 2
      });

      // Animate geometric shapes
      scene.children.forEach(child => {
        if (child instanceof THREE.Mesh && (child as any).rotationSpeed) {
          const speed = (child as any).rotationSpeed;

          child.rotation.x += speed.x;
          child.rotation.y += speed.y;
          child.rotation.z += speed.z;

          // Smooth scroll-based position adjustment
          child.position.y += Math.sin(easedScrollProgress * Math.PI * 2) * 0.02; // Reduced from 0.05
        }
      });

      // Calculate target camera position with reduced intensity
      const baseX = Math.sin(time * 0.2) * 2;
      const baseY = 2 + Math.cos(time * 0.15) * 1;
      const baseZ = 20;

      // Update target positions with smoother, more subtle movements
      targetCameraPosition.x = baseX + scrollSin * 2; // Reduced from 4
      targetCameraPosition.y = baseY + easedScrollProgress * 3; // Reduced from 5
      targetCameraPosition.z = baseZ - easedScrollProgress * 5; // Reduced from 8

      // Dynamic look-at target with reduced intensity
      targetLookAt.x = scrollSin * 0.8; // Reduced from 1.5
      targetLookAt.y = easedScrollProgress * 1.5; // Reduced from 2.5
      targetLookAt.z = -easedScrollProgress * 1.5; // Reduced from 2.5

      // Target FOV with subtle changes
      targetFOV = 75 + scrollSin * 4; // Reduced from 8

      // Smooth camera interpolation
      const cameraLerpFactor = 0.02; // Reduced from 0.05 - much slower camera movement

      camera.position.x = lerp(camera.position.x, targetCameraPosition.x, cameraLerpFactor);
      camera.position.y = lerp(camera.position.y, targetCameraPosition.y, cameraLerpFactor);
      camera.position.z = lerp(camera.position.z, targetCameraPosition.z, cameraLerpFactor);

      // Smooth look-at interpolation
      const currentLookAt = new THREE.Vector3();

      camera.getWorldDirection(currentLookAt);
      const targetLookAtVector = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);

      currentLookAt.lerp(targetLookAtVector.normalize(), 0.01); // Reduced from 0.03

      // Apply the smooth look-at
      camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);

      // Smooth FOV changes
      camera.fov = lerp(camera.fov, targetFOV, 0.015); // Reduced from 0.03
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      frameId.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current) return;

      const { camera, renderer } = sceneRef.current;

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
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
        sceneRef.current.scene.clear();
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

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
