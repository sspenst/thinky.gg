import { Game } from '@root/constants/Games';
import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Position from '@root/models/position';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Theme from '../../constants/theme';

interface WebGLGridProps {
  cellClassName?: (x: number, y: number) => string | undefined;
  cellStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  disableAnimation?: boolean;
  gameOverride?: Game;
  gameState: GameState;
  hideText?: boolean;
  id: string;
  leastMoves: number;
  onCellClick?: (x: number, y: number, rightClick: boolean, isDragging?: boolean) => void;
  onCellDrag?: (x: number, y: number, isDragging?: boolean) => void;
  onCellMouseDown?: (x: number, y: number, rightClick: boolean) => void;
  optimizeDom?: boolean;
  themeOverride?: Theme;
}

export default function WebGLGrid({
  gameState,
  id,
  leastMoves,
  onCellClick,
  onCellDrag,
  onCellMouseDown,
  gameOverride,
  hideText,
  disableAnimation
}: WebGLGridProps) {
  const { game: appGame } = useContext(AppContext);
  const game = gameOverride || appGame;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastTileDragged = useRef<Position | undefined>(undefined);
  const mousePos = useRef({ x: 0, y: 0 });

  // Animation state tracking
  const animatedPositions = useRef<Map<string, {
    startPos: Position;
    targetPos: Position;
    startTime: number;
    duration: number;
  }>>(new Map());
  const previousGameState = useRef<GameState | null>(null);
  const animationStartTime = useRef<number>(0);

  // Position tracking for particle lag effects
  const previousPositions = useRef<Map<string, Position>>(new Map());
  const currentPositions = useRef<Map<string, Position>>(new Map());

  // Shadow position tracking - follows player with easing
  const shadowPosition = useRef<Position>(new Position(0, 0));
  const lastShadowUpdate = useRef<number>(0);

  // Motion blur tracking
  const motionBlurHistory = useRef<Map<string, Array<{x: number, y: number, time: number}>>>(new Map());

  // Individual particle physics system
  interface Particle {
    x: number;
    y: number;
    vx: number; // velocity x
    vy: number; // velocity y
    targetX: number; // orbital target
    targetY: number; // orbital target
    angle: number; // orbital angle
    radius: number; // orbital radius
    id: number; // unique id
  }

  const MAX_PARTICLES = 60;
  const particles = useRef<Particle[]>([]);
  const particleUniformData = useRef<Float32Array>(new Float32Array(MAX_PARTICLES * 4)); // x,y,vx,vy per particle
  const lastPhysicsUpdate = useRef<number>(0);

  const height = gameState.board.length;
  const width = gameState.board[0].length;
  const gridId = `webgl-grid-${id}`;

  // WebGL shader sources
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    uniform vec2 u_resolution;
    
    void main() {
      vec2 zeroToOne = a_position / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_texCoord = a_texCoord;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform float u_time;
    uniform vec3 u_tileColor;
    uniform float u_tileType;
    uniform float u_glowIntensity;
    uniform float u_canMoveUp;
    uniform float u_canMoveDown;
    uniform float u_canMoveLeft;
    uniform float u_canMoveRight;
    uniform vec2 u_resolution;
    uniform float u_holeFillProgress;
    uniform vec2 u_previousPos;
    uniform vec2 u_currentPos;
    uniform vec2 u_motionBlurTrail[10]; // Previous positions for motion blur
    uniform float u_motionBlurIntensity;
    uniform vec2 u_velocity; // Movement velocity for motion blur
    uniform float u_motionBlurStrength;
    uniform vec4 u_particles[60]; // Individual particle positions and velocities
    uniform float u_particleCount;
    uniform vec2 u_tileGridPos; // Grid position of current tile being rendered
    uniform vec2 u_mousePos; // Mouse position in grid coordinates
    uniform vec2 u_shadowPos; // Shadow position that follows player with easing
    uniform float u_randomSeed; // Random seed for this tile
    
    // Hash function for noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    // Generate starry cosmic pattern for tiles
    vec3 generateStarField(vec2 uv, float time) {
      vec3 starField = vec3(0.02, 0.03, 0.08); // Deep space blue
      
      // Add stars with twinkling
      for (int i = 0; i < 12; i++) {
        float starId = float(i);
        vec2 starPos = vec2(
          hash(vec2(starId, 1.0)),
          hash(vec2(starId, 2.0))
        );
        
        float starDist = distance(uv, starPos);
        float twinkle = sin(time * (2.0 + starId * 0.5)) * 0.4 + 0.6;
        float star = exp(-starDist * 80.0) * twinkle;
        
        // Mix of blue and white stars
        vec3 starColor = mix(vec3(0.8, 0.9, 1.0), vec3(0.4, 0.7, 1.0), hash(vec2(starId, 3.0)));
        starField += starColor * star * 0.8;
      }
      
      // Add nebula-like cosmic dust
      float nebula1 = hash(uv * 3.0 + time * 0.1) * 0.3;
      float nebula2 = hash(uv * 5.0 - time * 0.15) * 0.2;
      starField += vec3(0.2, 0.1, 0.4) * nebula1;
      starField += vec3(0.1, 0.3, 0.6) * nebula2;
      
      return starField;
    }
    
    // Generate reflective floor effect
    vec3 generateReflection(vec2 uv, float time) {
      // Create floor reflection gradient
      float reflectionStrength = smoothstep(0.3, 1.0, uv.y) * 0.4;
      
      // Add reflective streaks
      float streak1 = sin(uv.x * 20.0 + time) * 0.5 + 0.5;
      float streak2 = sin(uv.x * 30.0 - time * 1.5) * 0.5 + 0.5;
      
      vec3 reflection = vec3(0.1, 0.2, 0.4) * reflectionStrength;
      reflection += vec3(0.0, 0.4, 0.8) * streak1 * streak2 * reflectionStrength * 0.3;
      
      return reflection;
    }
    
    // Apply motion blur effect to any color based on velocity
    vec3 applyMotionBlur(vec3 baseColor, vec2 uv, vec2 velocity, float strength) {
      if (length(velocity) < 0.01 || strength < 0.01) {
        return baseColor;
      }
      
      vec3 blurredColor = baseColor;
      vec2 blurDirection = normalize(velocity) * strength * 0.05;
      
      // Sample multiple points along the motion vector
      for (int i = 1; i <= 8; i++) {
        float offset = float(i) / 8.0;
        vec2 sampleUV = uv - blurDirection * offset;
        
        // Keep samples within bounds
        if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
          float falloff = 1.0 - offset;
          blurredColor += baseColor * falloff * 0.15;
        }
      }
      
      return blurredColor;
    }
    
    void main() {
      vec2 center = vec2(0.5);
      vec2 uv = v_texCoord - center;
      float dist = length(uv);
      float time = u_time;
      
      // Generate cosmic starfield and reflection for this tile
      vec3 starField = generateStarField(v_texCoord, time);
      vec3 reflection = generateReflection(v_texCoord, time);
      
      // High-tech color palette - neon pinks and purples  
      vec3 neonPink = vec3(1.0, 0.3, 0.8);
      vec3 neonPurple = vec3(0.8, 0.2, 1.0);
      vec3 brightMagenta = vec3(1.0, 0.4, 1.0);
      vec3 hologramWhite = vec3(1.0, 0.9, 0.95);
      vec3 brightCyan = vec3(0.3, 1.0, 1.0);
      vec3 neonBlue = vec3(0.2, 0.6, 1.0);
      vec2 shadowWorldPos = u_shadowPos;
      vec2 fragmentToShadow = shadowWorldPos - u_tileGridPos;
      float shadowDistance = length(fragmentToShadow);
      
      if (u_tileType == 0.0) { // Default - Atmospheric background with floating energy particles
        vec3 baseColor = vec3(0.05, 0.08, 0.12); // Dark blue background
        
        // Ambient floating particles with random positions per tile
        for (int i = 0; i < 6; i++) {
          float particleId = float(i);
          
          // Use random seed to create unique particle behavior per tile
          float particleRandom1 = hash(vec2(u_randomSeed + particleId * 15.0, particleId * 7.3));
          float particleRandom2 = hash(vec2(u_randomSeed + particleId * 23.0, particleId * 11.7));
          float particleRandom3 = hash(vec2(u_randomSeed + particleId * 31.0, particleId * 13.1));
          
          // Create slow drifting motion
          float driftSpeed1 = 0.3 + particleRandom1 * 0.4;
          float driftSpeed2 = 0.2 + particleRandom2 * 0.3;
          
          vec2 particlePos = vec2(
            particleRandom1 + sin(time * driftSpeed1 + particleRandom3 * 6.28) * 0.1,
            particleRandom2 + cos(time * driftSpeed2 + particleRandom3 * 6.28) * 0.08
          );
          
          // Add gravitational attraction to shadow position
          vec2 particleWorldPos = u_tileGridPos + particlePos;
          vec2 toShadow = u_shadowPos - particleWorldPos;
          float shadowDist = length(toShadow);
          
          // Apply subtle gravitational pull (only within reasonable range)
          if (shadowDist < 4.0) {
            float gravityStrength = 0.08 / max(shadowDist, 0.5);
            float gravityFalloff = 1.0 - smoothstep(0.0, 4.0, shadowDist);
            vec2 gravityPull = normalize(toShadow) * gravityStrength * gravityFalloff;
            particlePos += gravityPull * particleRandom3; // Random factor to vary response
          }
          
          // Wrap particles to stay within tile bounds
          particlePos = mod(particlePos, 1.0);
          
          float particleDist = distance(v_texCoord, particlePos);
          
          // Create soft glowing particles
          float particle = exp(-particleDist * 60.0);
          float particleGlow = exp(-particleDist * 25.0);
          
          // Vary particle colors slightly
          vec3 particleColor = mix(
            vec3(0.4, 0.7, 1.0), 
            vec3(0.8, 0.5, 1.0), 
            particleRandom3
          );
          
          baseColor += particleColor * particle * 0.8;
          baseColor += particleColor * particleGlow * 0.15;
        }
        
        // Network connections between particles (create energy web effect)
        for (int i = 0; i < 3; i++) {
          float lineId = float(i);
          float lineRandom = hash(vec2(u_randomSeed + lineId * 40.0, lineId * 17.0));
          
          // Create flowing energy lines
          float lineProgress = fract(time * (0.1 + lineRandom * 0.1) + lineRandom);
          vec2 lineStart = vec2(lineRandom, fract(lineRandom * 1.7));
          vec2 lineEnd = vec2(fract(lineRandom * 2.3), fract(lineRandom * 3.1));
          
          vec2 linePos = mix(lineStart, lineEnd, lineProgress);
          float lineDist = distance(v_texCoord, linePos);
          
          // Create thin flowing energy lines
          float line = exp(-lineDist * 80.0) * smoothstep(0.0, 0.3, lineProgress) * smoothstep(1.0, 0.7, lineProgress);
          
          vec3 lineColor = vec3(0.2, 0.8, 1.0);
          baseColor += lineColor * line * 0.4;
        }
        
        // Mathematical web grid that vibrates with player movement
        vec2 tileWorldPos = u_tileGridPos + v_texCoord;
        vec2 toPlayer = u_shadowPos - tileWorldPos;
        float playerDistance = length(toPlayer);
        
        // Create vibration based on player distance and movement
        float vibrationStrength = 1.0 - smoothstep(0.0, 5.0, playerDistance);
        float vibrationFreq = time * 2.0 + playerDistance * 0.5;
        float vibration = sin(vibrationFreq) * vibrationStrength * 0.02;
        
        // Mathematical grid lines - create web pattern
        vec2 webCoord = v_texCoord + vibration;
        
        // Horizontal and vertical grid lines
        float gridSpacing = 0.15;
        vec2 gridPos = webCoord / gridSpacing;
        vec2 gridFract = fract(gridPos);
        
        // Create thin grid lines
        float lineWidth = 0.05 + vibrationStrength * 0.03;
        float hLine = smoothstep(lineWidth, 0.0, abs(gridFract.y - 0.5));
        float vLine = smoothstep(lineWidth, 0.0, abs(gridFract.x - 0.5));
        
        // Diagonal grid lines for web effect
        vec2 diagCoord1 = webCoord * 1.414; // Rotated 45 degrees
        float diagPos1 = (diagCoord1.x + diagCoord1.y) / gridSpacing;
        float diagFract1 = fract(diagPos1);
        float dLine1 = smoothstep(lineWidth * 0.7, 0.0, abs(diagFract1 - 0.5));
        
        float diagPos2 = (diagCoord1.x - diagCoord1.y) / gridSpacing;
        float diagFract2 = fract(diagPos2);
        float dLine2 = smoothstep(lineWidth * 0.7, 0.0, abs(diagFract2 - 0.5));
        
        // Combine all grid lines
        float webLines = max(max(hLine, vLine), max(dLine1, dLine2) * 0.6);
        
        // Add intersection points (nodes)
        vec2 nodeCoord = fract(webCoord / gridSpacing);
        float nodeDistance = length(nodeCoord - 0.5);
        float nodes = smoothstep(0.08, 0.04, nodeDistance);
        
        // Create pulse effect at nodes based on player proximity
        float nodePulse = sin(time * 4.0 - playerDistance * 2.0) * 0.5 + 0.5;
        nodes *= (1.0 + vibrationStrength * nodePulse * 0.8);
        
        // Color the web based on proximity and vibration
        vec3 webColor = mix(
          vec3(0.2, 0.4, 0.8),  // Distant blue
          vec3(0.4, 0.8, 1.0),  // Close cyan
          vibrationStrength
        );
        
        // Add energy pulse along web lines
        float pulsePhase = time * 1.5 + hash(u_tileGridPos) * 6.28;
        float pulse = sin(pulsePhase) * 0.3 + 0.7;
        
        baseColor += webColor * (webLines * 0.3 + nodes * 0.6) * pulse;
        
        
        // Static grid outlines (more subtle now)
        float borderX = min(smoothstep(0.0, 0.008, v_texCoord.x), smoothstep(0.0, 0.008, 1.0 - v_texCoord.x));
        float borderY = min(smoothstep(0.0, 0.008, v_texCoord.y), smoothstep(0.0, 0.008, 1.0 - v_texCoord.y));
        float border = 1.0 - (borderX * borderY);
        
        // Dimmed border color to not compete with particle effects
        vec3 borderColor = neonPink * 0.6;
        baseColor += borderColor * border * 0.3;
        
        gl_FragColor = vec4(baseColor, 1.0);
        
      } else if (u_tileType == 0.5) { // Wall - Solid black with red proximity borders
        vec3 baseColor = vec3(0.0, 0.0, 0.0); // Solid black base
        
        // Calculate proximity to shadow for wall glow
        float wallProximity = 1.0 - smoothstep(0.0, 1.5, shadowDistance);
        
        if (wallProximity > 0.1) {
          vec3 wallBorderColor = vec3(1.0, 0.2, 0.2); // Red border color
          float wallBorderWidth = mix(0.05, 0.15, wallProximity);
          float wallIntensity = wallProximity * 0.8;
          
          // Create border on all edges
          float borderX = min(smoothstep(0.0, wallBorderWidth, v_texCoord.x), smoothstep(0.0, wallBorderWidth, 1.0 - v_texCoord.x));
          float borderY = min(smoothstep(0.0, wallBorderWidth, v_texCoord.y), smoothstep(0.0, wallBorderWidth, 1.0 - v_texCoord.y));
          float border = 1.0 - (borderX * borderY);
          
          baseColor += wallBorderColor * border * wallIntensity;
          
          // Add extra glow when very close
          if (wallProximity > 0.5) {
            float glowWidth = wallBorderWidth * 1.15;
            float glowX = min(smoothstep(0.0, glowWidth, v_texCoord.x), smoothstep(0.0, glowWidth, 1.0 - v_texCoord.x));
            float glowY = min(smoothstep(0.0, glowWidth, v_texCoord.y), smoothstep(0.0, glowWidth, 1.0 - v_texCoord.y));
            float glow = 1.0 - (glowX * glowY);
            
            baseColor += wallBorderColor * glow * (wallProximity - 0.5) * 0.4;
          }
        }
        
        gl_FragColor = vec4(baseColor, 1.0);
        
      } else if (u_tileType == 1.0) { // Player - Energy orb with clean particle ring
        vec3 baseColor = vec3(0.0);
        
        // Bright energy core
        float core = 1.0 - smoothstep(0.03, 0.06, dist);
        float innerGlow = 1.0 - smoothstep(0.06, 0.12, dist);
        
        baseColor += hologramWhite * core * 2.5;
        baseColor += neonPink * innerGlow * 0.8;
        
        // Clean orbiting particle ring
        for (int i = 0; i < 8; i++) {
          float particleId = float(i);
          float angle = particleId * 3.141/2.0 + cos(time * 1.0); // 8 particles, rotating
          float radius = 0.1 + sin(time * 3.0 + particleId) * 0.2;
          
          vec2 particlePos = vec2(cos(angle), sin(angle)) * radius;
          float particleDist = distance(uv, particlePos);
          
          float particle = exp(-particleDist * 25.0);
          float pulse = 0.28 + sin(time * 4.0 + particleId * 0.5) * 0.92;
          
          vec3 particleColor = mix(brightCyan, hologramWhite, pulse);
          baseColor += particleColor * particle * 0.8;
        }
        
        // Discard completely transparent areas
        if (length(baseColor) < 1.) {
          discard;
        }
        
        gl_FragColor = vec4(baseColor, 1.0);
        
      } else if (u_tileType == 2.0) { // Exit - Holographic portal with particles
        vec3 baseColor = starField * 0.8 + reflection;
        
        // Portal center - bright holographic core
        float portal = 1.0 - smoothstep(0.1, 0.3, dist);
        baseColor += hologramWhite * portal * 1.2;
        
        // Holographic portal rings
        float angle = atan(uv.y, uv.x);
        for (int i = 1; i <= 4; i++) {
          float ringDist = 0.15 + float(i) * 0.07;
          float ring = abs(dist - ringDist);
          ring = 1.0 - smoothstep(0.0, 0.015, ring);
          
          float rotation = angle + time * float(i) * 0.8;
          float modulation = sin(rotation * 6.0) * 0.4 + 0.6;
          
          // Alternate between purple and cyan
          float alternator = step(2.0, mod(float(i), 4.0));
          vec3 ringColor = mix(neonPurple, brightCyan, alternator);
          baseColor += ringColor * ring * modulation * 0.9;
        }
        
        // Energetic particles streaming toward portal
        for (int i = 0; i < 16; i++) {
          float particleId = float(i);
          float particleAngle = particleId * 0.392699 + time * 0.5; // particles orbiting
          float particleProgress = fract(time * 0.8 + particleId * 0.0625);
          float particleDist = 0.5 - particleProgress * 0.4; // flowing inward
          
          vec2 particlePos = vec2(cos(particleAngle), sin(particleAngle)) * particleDist;
          float particleDistance = distance(uv, particlePos);
          
          float particle = exp(-particleDistance * 25.0);
          float particleBrightness = (1.0 - particleProgress) * 0.9;
          
          vec3 particleColor = mix(brightCyan, neonPurple, particleProgress);
          baseColor += particleColor * particle * particleBrightness;
        }
        
        // Additional swirling particles around the portal
        for (int i = 0; i < 8; i++) {
          float swirlId = float(i);
          float swirlAngle = swirlId * 0.785398 + time * 2.0;
          float swirlDist = 0.3 + sin(time * 1.5 + swirlId) * 0.08;
          
          vec2 swirlPos = vec2(cos(swirlAngle), sin(swirlAngle)) * swirlDist;
          float swirlDistance = distance(uv, swirlPos);
          
          float swirl = exp(-swirlDistance * 20.0);
          baseColor += hologramWhite * swirl * 0.5;
        }
        
        // Holographic distortion effect
        float distortion = sin(dist * 20.0 - time * 3.0) * 0.1 * (1.0 - dist);
        baseColor *= (1.0 + distortion);
        
        gl_FragColor = vec4(baseColor, 1.0);
        
      } else if (u_tileType == 4.0) { // Hole - Black hole with blended edges
        // Start with background color and fade to black towards center
        vec3 baseColor = vec3(0.05, 0.08, 0.12) * (1.0 - smoothstep(0.3, 0.5, dist));
        
        // Event horizon with softer edge blending
        float horizon = smoothstep(0.45, 0.35, dist);
        
        // Single unified particle system - all particles spiral inward
        for (int i = 0; i < 2; i++) {
          float particleId = float(i);
          
          // Add randomness to make each black hole unique
          float holeRandom = hash(vec2(u_randomSeed + particleId * 40.0, particleId * 13.3));
          
          // All particles follow the same spiral pattern but at different distances and starting positions
          float particleAngle = particleId * 0.1078540 + time * (3.0 + holeRandom * 0.5) + holeRandom * 6.28; // Random phase offset
          float particleProgress = fract(time * (1.8 + holeRandom * 0.3) + particleId * 0.0125 + holeRandom);
          float particleRadius = 0.55 - particleProgress * (0.45 + holeRandom * 0.1);
          
          // Create tight inward spiral
          float spiralTightness = (1.0 - particleProgress) * 2.5;
          particleAngle += spiralTightness;
          
          vec2 particlePos = vec2(cos(particleAngle), sin(particleAngle)) * particleRadius;
          float particleDistance = distance(uv, particlePos);
          
          float particle = exp(-particleDistance * 25.0);
          
          // Brightness increases as particles get closer to center
          float brightness = (1.0 - particleProgress) * 1.5;
          
          // Color shifts from blue to white as particles approach event horizon
          vec3 particleColor = mix(neonBlue, hologramWhite, 1.0 - particleProgress);
          
          if (particleRadius > 0.03) {
            baseColor += particleColor * particle * brightness * (1.0 - horizon);
          }
        }
        
        // Event horizon ring
        float horizonRing = abs(dist - 0.35);
        horizonRing = 1.0 - smoothstep(0.0, 0.025, horizonRing);
        baseColor += neonBlue * horizonRing * 0.8;
        
        // Central darkness (black hole core)
        float core = 1.0 - smoothstep(0.28, 0.35, dist);
        baseColor *= (1.0 - core * 0.9);
        
        gl_FragColor = vec4(baseColor, 1.0);
        
      } else if (u_tileType >= 3.0) { // Movable blocks - SPARKING PARTICLE EXPLOSION!
        vec3 baseColor = vec3(0.12, 0.18, 0.25); // Solid base color
        
        // Real movement vector from uniforms (scale it down for slower lag)
        vec2 blockMovement = (u_shadowPos - u_previousPos) * 0.015;
        float movementIntensity = length(blockMovement);
        
        // Core particle field around block with gravitational attraction to player
        for (int i = 0; i < 20; i++) {
          float particleId = float(i);
          // Add randomness using the tile's random seed
          float randomOffset = hash(vec2(u_randomSeed + particleId, particleId * 3.7));
          float particleAngle = particleId * 3.14159/2.0 + time * (1.2 + randomOffset * 0.3) + randomOffset * 6.28; 
          float particleDist = 0.25*cos(time) + sin(time * (1.5 + randomOffset * 0.5) + particleId + randomOffset * 3.14) * (0.06 + randomOffset * 0.02);
          
          vec2 basePos = vec2(cos(particleAngle), sin(particleAngle)) * particleDist;
          
          // Calculate gravitational attraction based on the current fragment's world position using shadow position
          vec2 currentFragmentWorldPos = u_tileGridPos + (v_texCoord - 0.5); // Current fragment's world position
          
          // Apply gravitational pull when shadow is nearby (within 3 tiles)
          float gravityStrength = 0.3 / max(shadowDistance, 0.5); // Stronger when closer
          float maxGravityRange = 3.0;
          float gravityFalloff = 1.0 - smoothstep(0.0, maxGravityRange, shadowDistance);
          
          vec2 gravityDirection = normalize(fragmentToShadow) * gravityStrength * gravityFalloff;
          vec2 gravitationallyAttractedPos = basePos + gravityDirection * 0.4;
          
          // Apply real lag effect
          float lagAmount = 0.2 + particleId * 0.015;
          vec2 laggedPos = gravitationallyAttractedPos - blockMovement * lagAmount;
          
          float distance1 = distance(uv, laggedPos);
          float particle = exp(-distance1 * 10.0);
          
          // Intensity increases when player is closer
          float intensity = 0.8 + gravityFalloff * 0.4;
          baseColor += neonBlue * particle * intensity;
        }
        
        // SPARKING particles when being pushed
        if (movementIntensity > 0.01) {
          // Explosion of sparks in movement direction
          for (int i = 0; i < 5; i++) {
            float sparkId = float(i);
            // Add randomness to spark behavior
            float sparkRandom = hash(vec2(u_randomSeed + sparkId * 10.0, sparkId * 5.3));
            float sparkAngle = atan(blockMovement.y, blockMovement.x) + (sparkId - 15.0) * (0.2 + sparkRandom * 0.3);
            float sparkSpeed = 0.1 + sparkId * 0.0005 + sparkRandom * 0.05;
            float sparkTime = fract(time * (8.0 + sparkRandom * 2.0) + sparkId * 0.1 + sparkRandom);
            
            vec2 sparkPos = vec2(cos(sparkAngle), sin(sparkAngle)) * sparkSpeed * sparkTime;
            sparkPos -= blockMovement * 0.3; // Trail behind movement
            
            float sparkDistance = distance(uv, sparkPos);
            float spark = exp(-sparkDistance * 25.0);
            float sparkBrightness = (1.0 - sparkTime) * movementIntensity * 5.0;
            
            baseColor += hologramWhite * spark * sparkBrightness;
          }
          
          // Additional random flying sparks with gravitational attraction
          for (int i = 0; i < 20; i++) {
            float flyId = float(i);
            // Add randomness to flying spark behavior
            float flyRandom = hash(vec2(u_randomSeed + flyId * 20.0, flyId * 7.1));
            float flyAngle = flyId * 0.314159 + time * (6.0 + flyRandom * 2.0) + flyRandom * 6.28;
            float flyDist = sin(time * (4.0 + flyRandom) + flyId + flyRandom * 3.14) * (0.15 + flyRandom * 0.05);
            
            vec2 flyPos = vec2(cos(flyAngle), sin(flyAngle)) * flyDist;
            
            // Apply gravitational attraction based on current fragment's world position for sparks using shadow position
            vec2 currentFragmentWorldPos = u_tileGridPos + (v_texCoord - 0.5); // Current fragment's world position
            vec2 shadowWorldPos = u_shadowPos;
            vec2 fragmentToShadow = shadowWorldPos - currentFragmentWorldPos;
            float shadowDistance = length(fragmentToShadow);
            
            // Strong gravitational effect for energetic sparks
            float sparkGravityStrength = 0.4 / max(shadowDistance, 0.3);
            float sparkGravityRange = 3.5;
            float sparkGravityFalloff = 1.0 - smoothstep(0.0, sparkGravityRange, shadowDistance);
            
            vec2 sparkGravityDirection = normalize(fragmentToShadow) * sparkGravityStrength * sparkGravityFalloff;
            flyPos += sparkGravityDirection * 0.6;
            
            flyPos -= blockMovement * (  flyId * 0.02);
            
            float flyDistance = distance(uv, flyPos);
            float flySpark = exp(-flyDistance * 30.0);
            
            // Enhanced intensity when gravitationally influenced
            float sparkIntensity = movementIntensity * 3.0 * (1.0 + sparkGravityFalloff * 0.5);
            baseColor += neonPurple * flySpark * sparkIntensity;
          }
        }
        
        // Ambient energy particles (always present) with gravitational attraction
        for (int i = 0; i < 30; i++) {
          float ambientId = float(i);
          // Add randomness to ambient particle behavior
          float ambientRandom = hash(vec2(u_randomSeed + ambientId * 30.0, ambientId * 11.7));
          float ambientAngle = ambientId * 0.392699 + time * (0.8 + ambientRandom * 0.4) + ambientRandom * 6.28;
          float ambientDist = 0.2 + sin(time * (1.1 + ambientRandom * 0.3) + ambientId + ambientRandom * 3.141) * (0.08 + ambientRandom * 0.03);
          
          vec2 ambientPos = vec2(cos(ambientAngle), sin(ambientAngle)) * ambientDist;
          
          // Calculate gravitational attraction based on current fragment's world position for ambient particles using shadow position
          vec2 currentFragmentWorldPos = u_tileGridPos + (v_texCoord - 0.5); // Current fragment's world position
          vec2 shadowWorldPos = u_shadowPos;
          vec2 fragmentToShadow = shadowWorldPos - currentFragmentWorldPos;
          float shadowDistance = length(fragmentToShadow);
          
          // Gentler gravitational effect for ambient particles
          float ambientGravityStrength = 0.95 / max(shadowDistance*shadowDistance, 0.18);
          
          float ambientGravityRange = 2.5;
          float ambientGravityFalloff = 1.0 - smoothstep(0.0, ambientGravityRange, shadowDistance);
          
          vec2 ambientGravityDirection = normalize(fragmentToShadow) * ambientGravityStrength * ambientGravityFalloff;
          ambientPos += ambientGravityDirection * 0.3;
          
          // Gentle lag for ambient particles
          float ambientLag = 0.15 + ambientId * 0.01;
          ambientPos -= blockMovement * ambientLag;
          
          float ambientDistance = distance(uv, ambientPos);
          float ambient = exp(-ambientDistance * 18.0);
          
          // Slight intensity boost when gravitationally influenced
          float ambientIntensity = 0.6 + ambientGravityFalloff * 0.2;
          baseColor += brightCyan * ambient * ambientIntensity;
        }
        
        // Trail particles showing movement history
        for (int i = 0; i < 5; i++) {
          float trailId = float(i);
          vec2 trailPos = blockMovement/2.0 * (0.15  * 0.04);
          
          float trailDistance = distance(uv, trailPos);
          float trail = exp(-trailDistance * 12.0);
          float trailBrightness = (1.0 - trailId / 12.0) * 0.7;
          baseColor += neonBlue * trail * trailBrightness;
        }
        
        // Directional movement indicators with particle streams
        // Calculate distance from this tile to the player in grid space
        float playerDist = distance(u_tileGridPos, u_currentPos);
        // If player is within 1.5 units, increase border width smoothly
        float proximity = 1.0 - smoothstep(0.0, 1.5, playerDist);
        float borderWidth = mix(0.06, 0.25, proximity);
        
        // Calculate border width based on distance to shadow position  
        float shadowProximity = 1.0 - smoothstep(0.0, 2.0, shadowDistance);
        float realBorderWidth = 0.06; // Keep border width constant
        
        // Color transition: cyan -> green -> bright green as proximity increases
        
        vec3 proximityColor = vec3(0.2, 1.0, 0.2); // Bright green
        vec3 baseMovementColor = brightCyan * 0.9;
        vec3 moveColor = mix(baseMovementColor, proximityColor, shadowProximity);
        
        // Dynamic stream count based on shadow distance: 1 when far, 3 when close
        float dynamicStreamCount = 1.0 + shadowProximity * 10.0; // Ranges from 1 to 3
        const int maxStreamCount = 50;
        float check = 1.0;
        
        // Accelerate particles based on proximity
        float baseStreamSpeed = 0.50;
        float streamSpeed = baseStreamSpeed;
        
        // Glow intensity for movement borders
        float moveGlow = 1.0 + shadowProximity/10.0 * 11.5; // Extra glow when close

        // Red borders for blocked sides with proximity glow
        vec3 blockedColor = vec3(1.0, 0.1, 0.2); // Red for blocked sides
        float blockedBorderWidth = mix(0.04, 0.18, shadowProximity); // Width increases with proximity
        float blockedIntensity = 0.6 + shadowProximity * 0.4; // Glow increases with proximity
        
        // Top border - blocked if can't move down
        if (u_canMoveDown < 0.5) {
          float topBlockedBorder = 1.0 - smoothstep(0.0, blockedBorderWidth, v_texCoord.y);
          baseColor = mix(baseColor, blockedColor, topBlockedBorder * blockedIntensity);
          
          // Add extra glow when close
          if (shadowProximity > 0.3) {
            float glowSize = blockedBorderWidth * (1.0 + shadowProximity);
            float topGlow = 1.0 - smoothstep(0.0, glowSize, v_texCoord.y);
            baseColor += blockedColor * topGlow * shadowProximity * 0.3;
          }
        }
        
        // Bottom border - blocked if can't move up  
        if (u_canMoveUp < 0.5) {
          float bottomBlockedBorder = 1.0 - smoothstep(0.0, blockedBorderWidth, 1.0 - v_texCoord.y);
          baseColor = mix(baseColor, blockedColor, bottomBlockedBorder * blockedIntensity);
          
          // Add extra glow when close
          if (shadowProximity > 0.3) {
            float glowSize = blockedBorderWidth * (1.0 + shadowProximity);
            float bottomGlow = 1.0 - smoothstep(0.0, glowSize, 1.0 - v_texCoord.y);
            baseColor += blockedColor * bottomGlow * shadowProximity * 0.3;
          }
        }
        
        // Left border - blocked if can't move right
        if (u_canMoveRight < 0.5) {
          float leftBlockedBorder = 1.0 - smoothstep(0.0, blockedBorderWidth, v_texCoord.x);
          baseColor = mix(baseColor, blockedColor, leftBlockedBorder * blockedIntensity);
          
          // Add extra glow when close
          if (shadowProximity > 0.3) {
            float glowSize = blockedBorderWidth * (1.0 + shadowProximity);
            float leftGlow = 1.0 - smoothstep(0.0, glowSize, v_texCoord.x);
            baseColor += blockedColor * leftGlow * shadowProximity * 0.3;
          }
        }
        
        // Right border - blocked if can't move left
        if (u_canMoveLeft < 0.5) {
          float rightBlockedBorder = 1.0 - smoothstep(0.0, blockedBorderWidth, 1.0 - v_texCoord.x);
          baseColor = mix(baseColor, blockedColor, rightBlockedBorder * blockedIntensity);
          
          // Add extra glow when close
          if (shadowProximity > 0.3) {
            float glowSize = blockedBorderWidth * (1.0 + shadowProximity);
            float rightGlow = 1.0 - smoothstep(0.0, glowSize, 1.0 - v_texCoord.x);
            baseColor += blockedColor * rightGlow * shadowProximity * 0.3;
          }
        }

        if (u_canMoveDown > 0.5) {
          
          float topBorder = 1.0 - smoothstep(0.0, realBorderWidth, v_texCoord.y);
          baseColor = mix(baseColor, moveColor, topBorder * 0.8 * moveGlow);
          
          // Particle stream along border
          for (int i = 0; i < maxStreamCount; i++) {
            if (float(i) >= dynamicStreamCount) break;
            float streamX = fract(float(i) * 0.125 + time * streamSpeed);
            float streamDist = abs(v_texCoord.x - streamX);
            float stream = exp(-streamDist * 20.0) * topBorder;
            baseColor += hologramWhite * stream * moveGlow;
          }
        }
        
        if (u_canMoveUp > 0.5) {
          float bottomBorder = 1.0 - smoothstep(0.0, realBorderWidth, 1.0 - v_texCoord.y);
          baseColor = mix(baseColor, moveColor, bottomBorder * 0.8 * moveGlow);
          
          for (int i = 0; i < maxStreamCount; i++) {
            if (float(i) >= dynamicStreamCount) break;
            float streamX = fract(float(i) * 0.125 - time * streamSpeed);
            float streamDist = abs(v_texCoord.x - streamX);
            float stream = exp(-streamDist * 20.0) * bottomBorder;
            baseColor += hologramWhite * stream * moveGlow;
          }
        }
        
        if (u_canMoveRight > 0.5) {
          float leftBorder = 1.0 - smoothstep(0.0, realBorderWidth, v_texCoord.x);
          baseColor = mix(baseColor, moveColor, leftBorder * 0.8 * moveGlow);
          
          for (int i = 0; i < maxStreamCount; i++) {
            if (float(i) >= dynamicStreamCount) break;
            float streamY = fract(float(i) * 0.125 + time * streamSpeed);
            float streamDist = abs(v_texCoord.y - streamY);
            float stream = exp(-streamDist * 20.0) * leftBorder;
            baseColor += hologramWhite * stream * moveGlow;
          }
        }
        
        if (u_canMoveLeft > 0.5) {
          float rightBorder = 1.0 - smoothstep(0.0, realBorderWidth, 1.0 - v_texCoord.x);
          baseColor = mix(baseColor, moveColor, rightBorder * 0.8 * moveGlow);
          
          for (int i = 0; i < maxStreamCount; i++) {
            if (float(i) >= dynamicStreamCount) break;
            float streamY = fract(float(i) * 0.125 - time * streamSpeed);
            float streamDist = abs(v_texCoord.y - streamY);
            float stream = exp(-streamDist * 20.0) * rightBorder;
            baseColor += hologramWhite * stream * moveGlow;
          }
        }
        
        
        

      
        gl_FragColor = vec4(baseColor, 1.0);
      }
    }
  `;

  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);

    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);

      return null;
    }

    return shader;
  }, []);

  const createProgram = useCallback((gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram();

    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);

      return null;
    }

    return program;
  }, []);

  const getTileTypeValue = (tileType: TileType): number => {
    switch (tileType) {
    case TileType.Default:
      return 0;
    case TileType.Wall:
      return 0.5;
    case TileType.Player:
    case TileType.PlayerOnExit:
      return 1;
    case TileType.Exit:
      return 2;
    case TileType.Block:
    case TileType.BlockOnExit:
      return 3;
    case TileType.Hole:
      return 4;
      // Directional blocks
    case TileType.Left:
    case TileType.LeftOnExit:
      return 5;
    case TileType.Up:
    case TileType.UpOnExit:
      return 6;
    case TileType.Right:
    case TileType.RightOnExit:
      return 7;
    case TileType.Down:
    case TileType.DownOnExit:
      return 8;
    case TileType.UpLeft:
    case TileType.UpLeftOnExit:
      return 9;
    case TileType.UpRight:
    case TileType.UpRightOnExit:
      return 10;
    case TileType.DownRight:
    case TileType.DownRightOnExit:
      return 11;
    case TileType.DownLeft:
    case TileType.DownLeftOnExit:
      return 12;
    case TileType.LeftRight:
    case TileType.LeftRightOnExit:
      return 13;
    case TileType.UpDown:
    case TileType.UpDownOnExit:
      return 14;
      // NotDirectional blocks
    case TileType.NotLeft:
    case TileType.NotLeftOnExit:
      return 15;
    case TileType.NotUp:
    case TileType.NotUpOnExit:
      return 16;
    case TileType.NotRight:
    case TileType.NotRightOnExit:
      return 17;
    case TileType.NotDown:
    case TileType.NotDownOnExit:
      return 18;
    default:
      return 0;
    }
  };

  const getTileColor = (tileType: TileType): [number, number, number] => {
    switch (tileType) {
    case TileType.Player:
    case TileType.PlayerOnExit:
      return [0.0, 1.0, 0.8];
    case TileType.Exit:
      return [1.0, 0.4, 0.0];
    case TileType.Hole:
      return [0.0, 0.0, 0.0]; // Black for black hole effect
      // All movable blocks use the same base color (cyan)
    case TileType.Block:
    case TileType.BlockOnExit:
    case TileType.Left:
    case TileType.LeftOnExit:
    case TileType.Up:
    case TileType.UpOnExit:
    case TileType.Right:
    case TileType.RightOnExit:
    case TileType.Down:
    case TileType.DownOnExit:
    case TileType.UpLeft:
    case TileType.UpLeftOnExit:
    case TileType.UpRight:
    case TileType.UpRightOnExit:
    case TileType.DownRight:
    case TileType.DownRightOnExit:
    case TileType.DownLeft:
    case TileType.DownLeftOnExit:
    case TileType.LeftRight:
    case TileType.LeftRightOnExit:
    case TileType.UpDown:
    case TileType.UpDownOnExit:
    case TileType.NotLeft:
    case TileType.NotLeftOnExit:
    case TileType.NotUp:
    case TileType.NotUpOnExit:
    case TileType.NotRight:
    case TileType.NotRightOnExit:
    case TileType.NotDown:
    case TileType.NotDownOnExit:
      return [0.4, 0.8, 1.0]; // Unified cyan color for all movable blocks
    default:
      return [0.05, 0.08, 0.15];
    }
  };

  // Function to get interpolated position for animations
  const getInterpolatedPosition = useCallback((x: number, y: number, time: number): { x: number, y: number } => {
    const key = `${x}-${y}`;
    const animation = animatedPositions.current.get(key);

    if (!animation || disableAnimation) {
      return { x, y };
    }

    const elapsed = time - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1.0);

    // Smooth easing function
    const eased = progress * progress * (3.0 - 2.0 * progress);

    const interpX = animation.startPos.x + (animation.targetPos.x - animation.startPos.x) * eased;
    const interpY = animation.startPos.y + (animation.targetPos.y - animation.startPos.y) * eased;

    // Clean up completed animations
    if (progress >= 1.0) {
      animatedPositions.current.delete(key);
    }

    return { x: interpX, y: interpY };
  }, [disableAnimation]);

  const render = useCallback((gl: WebGLRenderingContext, program: WebGLProgram, time: number) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    // Update canvas size to match display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      console.log('Canvas resized to:', displayWidth, 'x', displayHeight);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    const tileSize = Math.min(canvas.width / width, canvas.height / height);
    const startX = (canvas.width - width * tileSize) / 2;
    const startY = (canvas.height - height * tileSize) / 2;

    if (time < 100) { // Log only for first few frames
      console.log('Render params:', { tileSize, startX, startY, canvasSize: [canvas.width, canvas.height] });
    }

    // Get uniform and attribute locations
    const u_resolution = gl.getUniformLocation(program, 'u_resolution');
    const u_time = gl.getUniformLocation(program, 'u_time');
    const u_tileColor = gl.getUniformLocation(program, 'u_tileColor');
    const u_tileType = gl.getUniformLocation(program, 'u_tileType');
    const u_glowIntensity = gl.getUniformLocation(program, 'u_glowIntensity');
    const u_canMoveUp = gl.getUniformLocation(program, 'u_canMoveUp');
    const u_canMoveDown = gl.getUniformLocation(program, 'u_canMoveDown');
    const u_canMoveLeft = gl.getUniformLocation(program, 'u_canMoveLeft');
    const u_canMoveRight = gl.getUniformLocation(program, 'u_canMoveRight');
    const u_holeFillProgress = gl.getUniformLocation(program, 'u_holeFillProgress');
    const u_previousPos = gl.getUniformLocation(program, 'u_previousPos');
    const u_currentPos = gl.getUniformLocation(program, 'u_currentPos');
    const u_motionBlurTrail = gl.getUniformLocation(program, 'u_motionBlurTrail');
    const u_motionBlurIntensity = gl.getUniformLocation(program, 'u_motionBlurIntensity');
    const u_velocity = gl.getUniformLocation(program, 'u_velocity');
    const u_motionBlurStrength = gl.getUniformLocation(program, 'u_motionBlurStrength');
    const u_particleCount = gl.getUniformLocation(program, 'u_particleCount');
    const u_tileGridPos = gl.getUniformLocation(program, 'u_tileGridPos');
    const a_position = gl.getAttribLocation(program, 'a_position');
    const a_texCoord = gl.getAttribLocation(program, 'a_texCoord');
    const u_mousePos = gl.getUniformLocation(program, 'u_mousePos');
    const u_shadowPos = gl.getUniformLocation(program, 'u_shadowPos');
    const u_randomSeed = gl.getUniformLocation(program, 'u_randomSeed');

    if (u_resolution) gl.uniform2f(u_resolution, canvas.width, canvas.height);
    if (u_time) gl.uniform1f(u_time, time * 0.001);

    // Calculate player position for proximity effects
    let playerCurrentPos = new Position(0, 0);

    if (gameState.pos) {
      const x = gameState.pos.x;
      const y = gameState.pos.y;

      // Get interpolated position for player animation
      const playerKey = `player-${x}-${y}`;
      const playerAnimation = animatedPositions.current.get(playerKey);
      let interpX = x;
      let interpY = y;

      if (playerAnimation && !disableAnimation) {
        const elapsed = time - playerAnimation.startTime;
        const progress = Math.min(elapsed / playerAnimation.duration, 1.0);
        const eased = progress * progress * (3.0 - 2.0 * progress);

        interpX = playerAnimation.startPos.x + (playerAnimation.targetPos.x - playerAnimation.startPos.x) * eased;
        interpY = playerAnimation.startPos.y + (playerAnimation.targetPos.y - playerAnimation.startPos.y) * eased;
      }

      playerCurrentPos = new Position(interpX, interpY);
    }

    // Update shadow position with easing (Hooke's law spring)
    const currentTime = time * 0.001;
    const deltaTime = currentTime - lastShadowUpdate.current;

    lastShadowUpdate.current = currentTime;

    if (deltaTime > 0 && deltaTime < 0.1) { // Prevent huge jumps
      const springStrength = 3.0; // How fast the shadow follows (lower = slower)
      const damping = 0.8; // Reduces oscillation

      // Calculate spring force toward player position
      const dx = playerCurrentPos.x - shadowPosition.current.x;
      const dy = playerCurrentPos.y - shadowPosition.current.y;

      // Apply spring physics with damping
      const forceX = dx * springStrength * deltaTime;
      const forceY = dy * springStrength * deltaTime;

      // Update shadow position
      shadowPosition.current.x += forceX * damping;
      shadowPosition.current.y += forceY * damping;
    } else {
      // Initialize shadow position if this is the first frame
      shadowPosition.current.x = playerCurrentPos.x;
      shadowPosition.current.y = playerCurrentPos.y;
    }

    // Set shadow position uniform
    if (u_shadowPos) gl.uniform2f(u_shadowPos, shadowPosition.current.x, shadowPosition.current.y);

    // Calculate player motion for later use
    const playerMotionPrevPos = previousPositions.current.get('player-particles') || playerCurrentPos;

    // Create a buffer for tile positions
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();

    if (!positionBuffer || !texCoordBuffer) return;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileState = gameState.board[y][x];
        const tileType = tileState.tileType;

        // Get interpolated position for animations
        const interpPos = getInterpolatedPosition(x, y, time);

        const left = startX + interpPos.x * tileSize;
        const top = startY + interpPos.y * tileSize;
        const right = left + tileSize;
        const bottom = top + tileSize;

        // Update position tracking for particle lag effects
        const tileKey = `${tileType}-${x}-${y}`;
        const currentPos = new Position(x, y);

        // Get interpolated position if animating
        let actualCurrentPos = currentPos;

        if (interpPos.x !== x || interpPos.y !== y) {
          actualCurrentPos = new Position(interpPos.x, interpPos.y);
        }

        const previousPos = currentPositions.current.get(tileKey) || actualCurrentPos;

        previousPositions.current.set(tileKey, previousPos);
        currentPositions.current.set(tileKey, actualCurrentPos);

        // Position vertices
        const positions = new Float32Array([
          left, top,
          right, top,
          left, bottom,
          left, bottom,
          right, top,
          right, bottom,
        ]);

        // Texture coordinates
        const texCoords = new Float32Array([
          0, 0,
          1, 0,
          0, 1,
          0, 1,
          1, 0,
          1, 1,
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        if (a_position >= 0) {
          gl.enableVertexAttribArray(a_position);
          gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        if (a_texCoord >= 0) {
          gl.enableVertexAttribArray(a_texCoord);
          gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);
        }

        const color = getTileColor(tileType);

        if (u_tileColor) gl.uniform3f(u_tileColor, color[0], color[1], color[2]);
        if (u_tileType) gl.uniform1f(u_tileType, getTileTypeValue(tileType));
        if (u_glowIntensity) gl.uniform1f(u_glowIntensity, tileState.text.length > 0 ? 0.8 : 0.3);
        if (u_tileGridPos) gl.uniform2f(u_tileGridPos, x, y);

        // Set random seed based on tile position for this specific tile's particle randomness
        const tileSeed = (x * 31.7 + y * 17.3 + getTileTypeValue(tileType) * 7.1) * 0.001;

        if (u_randomSeed) gl.uniform1f(u_randomSeed, tileSeed);

        // Set movement direction uniforms for movable blocks
        if (u_canMoveUp) gl.uniform1f(u_canMoveUp, TileTypeHelper.canMoveUp(tileType) ? 1.0 : 0.0);
        if (u_canMoveDown) gl.uniform1f(u_canMoveDown, TileTypeHelper.canMoveDown(tileType) ? 1.0 : 0.0);
        if (u_canMoveLeft) gl.uniform1f(u_canMoveLeft, TileTypeHelper.canMoveLeft(tileType) ? 1.0 : 0.0);
        if (u_canMoveRight) gl.uniform1f(u_canMoveRight, TileTypeHelper.canMoveRight(tileType) ? 1.0 : 0.0);
        // set player position
        if (u_currentPos) gl.uniform2f(u_currentPos, playerCurrentPos.x, playerCurrentPos.y);
        // Check if this hole is being filled
        let holeFillProgress = 0.0;

        if (tileType === TileType.Hole && tileState.blockInHole) {
          // Hole is filled, show as completely filled
          holeFillProgress = 1.0;
        } else if (tileType === TileType.Hole) {
          // Check if there's an active animation for a block moving into this hole
          const blockKey = `${x}-${y}`;
          const blockAnimation = animatedPositions.current.get(blockKey);

          if (blockAnimation && !disableAnimation) {
            const elapsed = time - blockAnimation.startTime;
            const progress = Math.min(elapsed / blockAnimation.duration, 1.0);

            holeFillProgress = progress;
          }
        }

        if (u_holeFillProgress) gl.uniform1f(u_holeFillProgress, holeFillProgress);

        // Calculate velocity for motion blur
        const velocityX = currentPos.x - previousPos.x;
        const velocityY = currentPos.y - previousPos.y;
        const isMoving = Math.abs(velocityX) > 0.001 || Math.abs(velocityY) > 0.001;
        const motionBlurStrength = isMoving ? Math.min(Math.sqrt(velocityX * velocityX + velocityY * velocityY) * 8.0, 1.0) : 0.0;

        if (u_velocity) gl.uniform2f(u_velocity, velocityX, velocityY);
        if (u_motionBlurStrength) gl.uniform1f(u_motionBlurStrength, motionBlurStrength);

        // Set mouse position uniform
        if (u_mousePos) gl.uniform2f(u_mousePos, mousePos.current.x, mousePos.current.y);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Render blocks
        if (tileState.block) {
          // Check if this block is being animated
          const blockKey = `${x}-${y}`;
          const blockAnimation = animatedPositions.current.get(blockKey);
          let blockLeft = left;
          let blockTop = top;

          if (blockAnimation && !disableAnimation) {
            const elapsed = time - blockAnimation.startTime;
            const progress = Math.min(elapsed / blockAnimation.duration, 1.0);
            const eased = progress * progress * (3.0 - 2.0 * progress);

            const animInterpX = blockAnimation.startPos.x + (blockAnimation.targetPos.x - blockAnimation.startPos.x) * eased;
            const animInterpY = blockAnimation.startPos.y + (blockAnimation.targetPos.y - blockAnimation.startPos.y) * eased;

            blockLeft = startX + animInterpX * tileSize;
            blockTop = startY + animInterpY * tileSize;
          }

          const blockRight = blockLeft + tileSize;
          const blockBottom = blockTop + tileSize;

          const blockPositions = new Float32Array([
            blockLeft, blockTop,
            blockRight, blockTop,
            blockLeft, blockBottom,
            blockLeft, blockBottom,
            blockRight, blockTop,
            blockRight, blockBottom,
          ]);

          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, blockPositions, gl.STATIC_DRAW);

          if (a_position >= 0) {
            gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
          }

          const blockColor = getTileColor(tileState.block.tileType);

          if (u_tileColor) gl.uniform3f(u_tileColor, blockColor[0], blockColor[1], blockColor[2]);
          if (u_tileType) gl.uniform1f(u_tileType, getTileTypeValue(tileState.block.tileType));
          if (u_glowIntensity) gl.uniform1f(u_glowIntensity, 0.6);
          if (u_tileGridPos) gl.uniform2f(u_tileGridPos, x, y);

          // Set random seed based on tile position for this specific tile's particle randomness
          const tileSeed = (x * 31.7 + y * 17.3 + getTileTypeValue(tileType) * 7.1) * 0.001;

          if (u_randomSeed) gl.uniform1f(u_randomSeed, tileSeed);

          // Set movement direction uniforms for blocks
          if (u_canMoveUp) gl.uniform1f(u_canMoveUp, TileTypeHelper.canMoveUp(tileState.block.tileType) ? 1.0 : 0.0);
          if (u_canMoveDown) gl.uniform1f(u_canMoveDown, TileTypeHelper.canMoveDown(tileState.block.tileType) ? 1.0 : 0.0);
          if (u_canMoveLeft) gl.uniform1f(u_canMoveLeft, TileTypeHelper.canMoveLeft(tileState.block.tileType) ? 1.0 : 0.0);
          if (u_canMoveRight) gl.uniform1f(u_canMoveRight, TileTypeHelper.canMoveRight(tileState.block.tileType) ? 1.0 : 0.0);

          // Update block position tracking for particles
          const blockTrackingKey = `block-${tileState.block.tileType}-${x}-${y}`;
          const blockCurrentPos = new Position(blockLeft / tileSize - startX / tileSize, blockTop / tileSize - startY / tileSize);
          const blockPreviousPos = currentPositions.current.get(blockTrackingKey) || blockCurrentPos;

          previousPositions.current.set(blockTrackingKey, blockPreviousPos);
          currentPositions.current.set(blockTrackingKey, blockCurrentPos);

          // Set block position uniforms for particle lag effects

          // Calculate block velocity for motion blur
          const blockVelocityX = blockCurrentPos.x - blockPreviousPos.x;
          const blockVelocityY = blockCurrentPos.y - blockPreviousPos.y;
          const blockIsMoving = Math.abs(blockVelocityX) > 0.001 || Math.abs(blockVelocityY) > 0.001;
          const blockMotionBlurStrength = blockIsMoving ? Math.min(Math.sqrt(blockVelocityX * blockVelocityX + blockVelocityY * blockVelocityY) * 8.0, 1.0) : 0.0;

          if (u_velocity) gl.uniform2f(u_velocity, blockVelocityX, blockVelocityY);
          if (u_motionBlurStrength) gl.uniform1f(u_motionBlurStrength, blockMotionBlurStrength);

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        if (tileState.blockInHole) {
          // When hole is filled, render as a default tile instead of hole
          const defaultColor = getTileColor(TileType.Default);

          if (u_tileColor) gl.uniform3f(u_tileColor, defaultColor[0], defaultColor[1], defaultColor[2]);
          if (u_tileType) gl.uniform1f(u_tileType, getTileTypeValue(TileType.Default)); // Render as default tile
          if (u_glowIntensity) gl.uniform1f(u_glowIntensity, 0.6);

          // Clear movement uniforms for filled hole
          if (u_canMoveUp) gl.uniform1f(u_canMoveUp, 0.0);
          if (u_canMoveDown) gl.uniform1f(u_canMoveDown, 0.0);
          if (u_canMoveLeft) gl.uniform1f(u_canMoveLeft, 0.0);
          if (u_canMoveRight) gl.uniform1f(u_canMoveRight, 0.0);

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
    }

    // Render player
    if (gameState.pos) {
      const x = gameState.pos.x;
      const y = gameState.pos.y;

      // Get interpolated position for player animation
      const playerKey = `player-${x}-${y}`;
      const playerAnimation = animatedPositions.current.get(playerKey);
      let interpX = x;
      let interpY = y;

      if (playerAnimation && !disableAnimation) {
        const elapsed = time - playerAnimation.startTime;
        const progress = Math.min(elapsed / playerAnimation.duration, 1.0);
        const eased = progress * progress * (3.0 - 2.0 * progress);

        interpX = playerAnimation.startPos.x + (playerAnimation.targetPos.x - playerAnimation.startPos.x) * eased;
        interpY = playerAnimation.startPos.y + (playerAnimation.targetPos.y - playerAnimation.startPos.y) * eased;

        if (progress >= 1.0) {
          animatedPositions.current.delete(playerKey);
        }
      }

      // Make player render area 3x larger so particles aren't clipped
      const playerSize = tileSize * 3;
      const left = startX + interpX * tileSize - tileSize;
      const top = startY + interpY * tileSize - tileSize;
      const right = left + playerSize;
      const bottom = top + playerSize;

      const positions = new Float32Array([
        left, top,
        right, top,
        left, bottom,
        left, bottom,
        right, top,
        right, bottom,
      ]);

      const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
      ]);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);

      const isComplete = game.isComplete(gameState);
      const playerColor: [number, number, number] = isComplete ? [1.0, 1.0, 0.0] : [0.0, 1.0, 0.8];

      if (u_tileColor) gl.uniform3f(u_tileColor, playerColor[0], playerColor[1], playerColor[2]);
      if (u_tileType) gl.uniform1f(u_tileType, 1);
      if (u_glowIntensity) gl.uniform1f(u_glowIntensity, isComplete ? 1.0 : 0.8);

      // Player doesn't have movement restrictions, so set all to 0
      if (u_canMoveUp) gl.uniform1f(u_canMoveUp, 0.0);
      if (u_canMoveDown) gl.uniform1f(u_canMoveDown, 0.0);
      if (u_canMoveLeft) gl.uniform1f(u_canMoveLeft, 0.0);
      if (u_canMoveRight) gl.uniform1f(u_canMoveRight, 0.0);

      // Initialize particles if needed
      if (particles.current.length === 0) {
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const angle = (i / MAX_PARTICLES) * Math.PI * 2;
          const ring = Math.floor(i / 20); // 3 rings of 20 particles each
          const radius = 0.06 + ring * 0.03;

          particles.current.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            targetX: Math.cos(angle) * radius,
            targetY: Math.sin(angle) * radius,
            angle: angle,
            radius: radius,
            id: i
          });
        }
      }

      // Update particle physics
      const currentTime = time * 0.001;
      const deltaTime = currentTime - lastPhysicsUpdate.current;

      lastPhysicsUpdate.current = currentTime;

      const playerCurrentPos = new Position(interpX, interpY);
      const gravity = 0.8; // Gravitational strength
      const damping = 0.92; // Air resistance
      const orbitStrength = 0.3; // How strongly particles want to maintain orbit
      const maxSpeed = 0.08;

      // Update each particle
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];

        // Update orbital target (rotates around player)
        p.angle += (0.5 + i * 0.01) * deltaTime;
        p.targetX = Math.cos(p.angle) * p.radius;
        p.targetY = Math.sin(p.angle) * p.radius;

        // Calculate forces
        // 1. Gravitational pull toward player center
        const dx = -p.x;
        const dy = -p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const gravityForceX = (dx / dist) * gravity / (dist + 0.1);
        const gravityForceY = (dy / dist) * gravity / (dist + 0.1);

        // 2. Orbital force (tries to maintain circular orbit)
        const orbitDx = p.targetX - p.x;
        const orbitDy = p.targetY - p.y;
        const orbitForceX = orbitDx * orbitStrength;
        const orbitForceY = orbitDy * orbitStrength;

        // Apply forces to velocity
        p.vx += (gravityForceX + orbitForceX) * deltaTime;
        p.vy += (gravityForceY + orbitForceY) * deltaTime;

        // Apply damping
        p.vx *= damping;
        p.vy *= damping;

        // Limit max speed
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Store in uniform data (relative to player position)
        particleUniformData.current[i * 4 + 0] = p.x;
        particleUniformData.current[i * 4 + 1] = p.y;
        particleUniformData.current[i * 4 + 2] = p.vx;
        particleUniformData.current[i * 4 + 3] = p.vy;
      }

      // Standard motion blur tracking
      const playerMotionKey = 'player';
      let history = motionBlurHistory.current.get(playerMotionKey) || [];

      history.push({ x: interpX, y: interpY, time: currentTime });
      history = history.filter(pos => currentTime - pos.time < 0.2).slice(-10);
      motionBlurHistory.current.set(playerMotionKey, history);

      // Calculate motion blur intensity
      const playerMotionPrevPos = previousPositions.current.get('player-particles') || playerCurrentPos;
      const movementX = Math.abs(playerCurrentPos.x - playerMotionPrevPos.x);
      const movementY = Math.abs(playerCurrentPos.y - playerMotionPrevPos.y);
      const isAnimating = interpX !== x || interpY !== y;
      const motionIntensity = (movementX + movementY) * 10 + (isAnimating ? 0.5 : 0.0);

      previousPositions.current.set('player-particles', playerCurrentPos);

      // Set particle uniforms
      if (u_particleCount) gl.uniform1f(u_particleCount, MAX_PARTICLES);

      // Set individual particle uniforms
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const uniformLocation = gl.getUniformLocation(program, `u_particles[${i}]`);

        if (uniformLocation) {
          gl.uniform4f(
            uniformLocation,
            particleUniformData.current[i * 4 + 0],
            particleUniformData.current[i * 4 + 1],
            particleUniformData.current[i * 4 + 2],
            particleUniformData.current[i * 4 + 3]
          );
        }
      }

      // Pass motion blur trail to shader
      const trail = new Float32Array(20); // 10 positions * 2 floats each

      for (let i = 0; i < 10; i++) {
        if (i < history.length) {
          trail[i * 2] = history[i].x;
          trail[i * 2 + 1] = history[i].y;
        } else {
          // Use current position for unused slots
          trail[i * 2] = interpX;
          trail[i * 2 + 1] = interpY;
        }
      }

      if (u_motionBlurTrail) {
        for (let i = 0; i < 10; i++) {
          const uniformLocation = gl.getUniformLocation(program, `u_motionBlurTrail[${i}]`);

          if (uniformLocation) {
            gl.uniform2f(uniformLocation, trail[i * 2], trail[i * 2 + 1]);
          }
        }
      }

      if (u_motionBlurIntensity) gl.uniform1f(u_motionBlurIntensity, Math.min(motionIntensity, 1.0));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(texCoordBuffer);
  }, [gameState, width, height, game, getInterpolatedPosition, disableAnimation]);

  // Detect game state changes and set up animations
  useEffect(() => {
    if (!previousGameState.current || disableAnimation) {
      previousGameState.current = gameState;

      return;
    }

    const currentTime = performance.now();
    const normalDuration = 100; // 100ms for normal moves
    const holeFillDuration = 50; // 50ms for hole filling (faster suction effect)

    // Check for player movement
    if (previousGameState.current.pos && gameState.pos) {
      const prevPos = previousGameState.current.pos;
      const newPos = gameState.pos;

      if (prevPos.x !== newPos.x || prevPos.y !== newPos.y) {
        const playerKey = `player-${newPos.x}-${newPos.y}`;

        animatedPositions.current.set(playerKey, {
          startPos: prevPos,
          targetPos: newPos,
          startTime: currentTime,
          duration: normalDuration
        });
      }
    }

    // Check for block movements and hole filling
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const prevTile = previousGameState.current.board[y][x];
        const currentTile = gameState.board[y][x];

        // Check if a hole was filled (block moved into hole)
        if (prevTile.tileType === TileType.Hole &&
            currentTile.blockInHole &&
            !prevTile.blockInHole) {
          // Find where the block came from
          for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
              const prevOtherTile = previousGameState.current.board[py][px];
              const currentOtherTile = gameState.board[py][px];

              if (prevOtherTile.block &&
                  !currentOtherTile.block &&
                  prevOtherTile.block.tileType === currentTile.blockInHole.tileType) {
                // Animate block moving into hole with suction effect
                const blockKey = `${x}-${y}`;

                animatedPositions.current.set(blockKey, {
                  startPos: new Position(px, py),
                  targetPos: new Position(x, y),
                  startTime: currentTime,
                  duration: holeFillDuration // Faster animation for suction
                });
                break;
              }
            }
          }
        }

        // Check for regular block movements
        else if (currentTile.block && !prevTile.block) {
          // Block moved to this position
          for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
              const prevOtherTile = previousGameState.current.board[py][px];
              const currentOtherTile = gameState.board[py][px];

              if (prevOtherTile.block &&
                  !currentOtherTile.block &&
                  prevOtherTile.block.tileType === currentTile.block.tileType) {
                const blockKey = `${x}-${y}`;

                animatedPositions.current.set(blockKey, {
                  startPos: new Position(px, py),
                  targetPos: new Position(x, y),
                  startTime: currentTime,
                  duration: normalDuration
                });
                break;
              }
            }
          }
        }
      }
    }

    previousGameState.current = gameState;
  }, [gameState, height, width, disableAnimation]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      console.log('WebGL: Canvas not found');

      return;
    }

    const gl = canvas.getContext('webgl');

    if (!gl) {
      console.error('WebGL not supported');

      return;
    }

    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      console.error('WebGL: Failed to create shaders');

      return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
      console.error('WebGL: Failed to create program');

      return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent background
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const animate = (time: number) => {
      render(gl, program, time);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [createProgram, createShader, fragmentShaderSource, render, vertexShaderSource]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileSize = Math.min(canvas.width / width, canvas.height / height);
    const startX = (canvas.width - width * tileSize) / 2;
    const startY = (canvas.height - height * tileSize) / 2;

    const tileX = Math.floor((x - startX) / tileSize);
    const tileY = Math.floor((y - startY) / tileSize);

    if (tileX >= 0 && tileX < width && tileY >= 0 && tileY < height) {
      onCellClick(tileX, tileY, e.button === 2, isDragging);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown || !onCellDrag) return;

    setIsDragging(true);
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileSize = Math.min(canvas.width / width, canvas.height / height);
    const startX = (canvas.width - width * tileSize) / 2;
    const startY = (canvas.height - height * tileSize) / 2;

    const tileX = Math.floor((x - startX) / tileSize);
    const tileY = Math.floor((y - startY) / tileSize);

    if (tileX === lastTileDragged.current?.x && tileY === lastTileDragged.current?.y) {
      return;
    }

    lastTileDragged.current = new Position(tileX, tileY);

    if (tileX >= 0 && tileX < width && tileY >= 0 && tileY < height) {
      onCellDrag(tileX, tileY, isDragging);
    }
  };

  return (
    <div className='grow flex items-center justify-center overflow-hidden' id={gridId}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
        }}
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasClick}

        onMouseDown={(e) => {
          setIsMouseDown(true);

          if (onCellMouseDown) {
            const canvas = canvasRef.current;

            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const tileSize = Math.min(canvas.width / width, canvas.height / height);
            const startX = (canvas.width - width * tileSize) / 2;
            const startY = (canvas.height - height * tileSize) / 2;

            const tileX = Math.floor((x - startX) / tileSize);
            const tileY = Math.floor((y - startY) / tileSize);

            lastTileDragged.current = new Position(tileX, tileY);
            // update uniform
            onCellMouseDown(tileX, tileY, e.button === 2);
          }
        }}
        onMouseUp={() => {
          setIsMouseDown(false);
          setIsDragging(false);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setIsMouseDown(false);
          setIsDragging(false);
        }}
      />
    </div>
  );
}
