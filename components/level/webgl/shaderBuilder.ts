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
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
}