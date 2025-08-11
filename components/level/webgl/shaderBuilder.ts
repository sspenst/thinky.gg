import { 
  shaderUtils, 
  numberRenderingUtils, 
  colorPalette 
} from './shaderModules';

import {
  defaultTileShader,
  wallTileShader,
  playerTileShader,
  exitTileShader,
  holeTileShader,
  movableBlockShader
} from './blockShaders';

export function buildVertexShader(): string {
  return `
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
}

export function buildFragmentShader(): string {
  return `
    precision mediump float;
    varying vec2 v_texCoord;
    
    // Uniforms
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
    uniform vec2 u_motionBlurTrail[10];
    uniform float u_motionBlurIntensity;
    uniform vec2 u_velocity;
    uniform float u_motionBlurStrength;
    uniform vec4 u_particles[60];
    uniform float u_particleCount;
    uniform vec2 u_tileGridPos;
    uniform vec2 u_mousePos;
    uniform vec2 u_shadowPos;
    uniform float u_randomSeed;
    uniform float u_currentStepCount;
    uniform float u_goalStepCount;
    uniform float u_trailStepCount;
    uniform float u_victoryTime;
    uniform float u_victoryEffect;
    uniform float u_playerCompleteTime;
    
    // Color palette
    ${colorPalette}
    
    // Utility functions
    ${shaderUtils}
    
    // Number rendering functions
    ${numberRenderingUtils}
    
    // Block type renderers
    ${defaultTileShader}
    ${wallTileShader}
    ${playerTileShader}
    ${exitTileShader}
    ${holeTileShader}
    ${movableBlockShader}
    
    // Victory Effect 1: Rainbow Wave & Fireworks
    vec3 victoryEffectRainbowWave(vec3 baseColor) {
      vec3 color = baseColor;
      
      // Radial wave effect from player position
      vec2 playerGridPos = u_shadowPos + vec2(0.5, 0.5);
      vec2 tileWorldPos = u_tileGridPos + v_texCoord;
      float dist = distance(tileWorldPos, playerGridPos);
      
      float waveRadius = u_victoryTime * 4.0;
      float waveWidth = 0.8;
      float waveDist = abs(dist - waveRadius);
      float waveIntensity = 1.0 - smoothstep(0.0, waveWidth, waveDist);
      waveIntensity *= smoothstep(0.0, 0.3, u_victoryTime) * (1.0 - smoothstep(2.5, 3.5, u_victoryTime));
      
      // Rainbow wave colors
      float hue = u_victoryTime * 3.0 - dist * 0.5;
      vec3 rainbow = vec3(
        sin(hue) * 0.5 + 0.5,
        sin(hue + 2.094) * 0.5 + 0.5,
        sin(hue + 4.189) * 0.5 + 0.5
      );
      
      // Sparkle particles
      float sparkleNoise = hash(v_texCoord * 30.0 + vec2(u_time * 2.0, u_victoryTime));
      float sparkleThreshold = 0.97 - u_victoryTime * 0.05;
      sparkleThreshold = max(sparkleThreshold, 0.85);
      float sparkle = step(sparkleThreshold, sparkleNoise);
      sparkle *= sin(u_victoryTime * 15.0 + sparkleNoise * 30.0) * 0.5 + 0.5;
      
      // Firework explosions
      for (int i = 0; i < 3; i++) {
        float fireworkTime = u_victoryTime - float(i) * 0.4;
        if (fireworkTime > 0.0 && fireworkTime < 1.5) {
          vec2 fireworkPos = vec2(
            hash(vec2(float(i), 0.0)) * 10.0 - 5.0,
            hash(vec2(float(i), 1.0)) * 10.0 - 5.0
          );
          float fireworkDist = distance(tileWorldPos - playerGridPos, fireworkPos);
          float explosion = exp(-fireworkDist * 2.0 / (fireworkTime + 0.1));
          explosion *= (1.0 - fireworkTime / 1.5);
          
          vec3 fireworkColor = vec3(
            hash(vec2(float(i), 2.0)),
            hash(vec2(float(i), 3.0)),
            hash(vec2(float(i), 4.0))
          ) * 2.0;
          
          color += fireworkColor * explosion;
        }
      }
      
      // Combine wave effect
      color = mix(color, rainbow * 2.0, waveIntensity * 0.6);
      color += vec3(sparkle * 2.0) * smoothstep(0.0, 0.5, u_victoryTime) * (1.0 - smoothstep(3.0, 4.0, u_victoryTime));
      
      // Global brightness pulse
      float brightnessPulse = 1.0 + sin(u_victoryTime * 10.0) * 0.2 * smoothstep(0.0, 0.5, u_victoryTime) * (1.0 - smoothstep(2.0, 3.0, u_victoryTime));
      color *= brightnessPulse;
      
      return color;
    }
    
    // Victory Effect 2: Matrix Digital Rain & Glitch
    vec3 victoryEffectMatrixGlitch(vec3 baseColor) {
      vec3 color = baseColor;
      
      // Matrix-style digital rain
      vec2 gridPos = floor(u_tileGridPos + v_texCoord * 2.0);
      float columnSeed = hash(vec2(gridPos.x, 0.0));
      float rainSpeed = 2.0 + columnSeed * 2.0;
      float rainOffset = columnSeed * 10.0;
      
      float rainY = fract((u_victoryTime * rainSpeed + rainOffset) * 0.3);
      float tileY = fract((u_tileGridPos.y + v_texCoord.y) * 2.0);
      
      float rain = smoothstep(rainY - 0.3, rainY, tileY) * (1.0 - smoothstep(rainY, rainY + 0.05, tileY));
      rain *= smoothstep(0.0, 0.5, u_victoryTime) * (1.0 - smoothstep(3.0, 4.0, u_victoryTime));
      
      // Green matrix color
      vec3 matrixGreen = vec3(0.0, 1.0, 0.2);
      color = mix(color, matrixGreen * 2.0, rain * 0.8);
      
      // Glitch distortion waves
      float glitchWave = sin(u_tileGridPos.y * 10.0 + u_victoryTime * 20.0);
      float glitchIntensity = smoothstep(0.5, 1.0, abs(glitchWave));
      glitchIntensity *= smoothstep(0.2, 0.5, u_victoryTime) * (1.0 - smoothstep(2.5, 3.0, u_victoryTime));
      
      // RGB channel split glitch
      if (glitchIntensity > 0.5 && hash(vec2(u_victoryTime * 10.0, gridPos.y)) > 0.7) {
        vec2 offset = vec2(sin(u_victoryTime * 50.0) * 0.02, 0.0);
        color.r = mix(color.r, 1.0, glitchIntensity);
        color.g = mix(color.g, 0.0, glitchIntensity * 0.5);
        color.b = mix(color.b, color.b * 2.0, glitchIntensity);
      }
      
      // Binary code overlay
      float binaryNoise = hash(gridPos + vec2(floor(u_victoryTime * 10.0), 0.0));
      if (binaryNoise > 0.8) {
        float binaryBrightness = step(0.5, fract(sin(dot(gridPos, vec2(12.9898, 78.233))) * 43758.5453));
        color += matrixGreen * binaryBrightness * 0.5 * rain;
      }
      
      // Scanlines
      float scanline = sin((u_tileGridPos.y + v_texCoord.y) * 100.0 + u_victoryTime * 10.0) * 0.04;
      color *= 1.0 + scanline;
      
      // Digital corruption blocks
      float blockSize = 0.1;
      vec2 blockCoord = floor((u_tileGridPos + v_texCoord) / blockSize) * blockSize;
      float corruption = hash(blockCoord + vec2(floor(u_victoryTime * 5.0), 0.0));
      if (corruption > 0.95) {
        color = vec3(0.0, corruption * 2.0, corruption * 0.5);
      }
      
      // Power surge pulse (much gentler)
      float powerSurge = sin(u_victoryTime * 15.0) * 0.3 + 0.3;
      powerSurge *= smoothstep(0.0, 0.5, u_victoryTime) * (1.0 - smoothstep(2.0, 3.0, u_victoryTime));
      color += matrixGreen * powerSurge * 0.15;
      
      return color;
    }
    
    // Main victory effect selector
    vec3 applyVictoryEffect(vec3 baseColor) {
      if (u_victoryTime <= 0.0) return baseColor;
      
      vec3 color = baseColor;
      
      // Select effect based on u_victoryEffect uniform
      if (u_victoryEffect < 0.5) {
        color = victoryEffectRainbowWave(baseColor);
      } else if (u_victoryEffect < 1.5) {
        color = victoryEffectMatrixGlitch(baseColor);
      }
      
      // Common fade in/out for all effects
      float fadeIn = smoothstep(0.0, 0.1, u_victoryTime);
      float fadeOut = 1.0 - smoothstep(4.0, 5.0, u_victoryTime);
      color = mix(baseColor, color, fadeIn * fadeOut);
      
      return color;
    }
    
    void main() {
      vec3 finalColor = vec3(0.0);
      
      if (u_tileType == 0.0) {
        // Default/Empty tile
        finalColor = renderDefaultTile();
      } else if (u_tileType == 0.5) {
        // Wall
        finalColor = renderWallTile();
      } else if (u_tileType == 1.0) {
        // Player
        finalColor = renderPlayerTile();
      } else if (u_tileType == 2.0) {
        // Exit
        finalColor = renderExitTile();
      } else if (u_tileType == 4.0) {
        // Hole
        finalColor = renderHoleTile();
      } else if (u_tileType >= 3.0) {
        // Movable blocks
        finalColor = renderMovableBlock();
      }
      
      // Apply victory celebration effect
      finalColor = applyVictoryEffect(finalColor);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
}