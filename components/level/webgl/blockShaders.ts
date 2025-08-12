// Individual block type shader implementations

// Default/Empty tile shader
export const defaultTileShader = `
  vec3 renderDefaultTile() {
    vec3 baseColor = vec3(0.05, 0.08, 0.12); // Dark blue background
    
    // Add solid dark purple background for visited tiles
    if (u_trailStepCount >= 0.0) {
      baseColor = vec3(0.15, 0.05, 0.5);
    }
    
    // Ambient floating particles
    for (int i = 0; i < 6; i++) {
      float particleId = float(i);
      
      float particleRandom1 = hash(vec2(u_randomSeed + particleId * 15.0, particleId * 7.3));
      float particleRandom2 = hash(vec2(u_randomSeed + particleId * 23.0, particleId * 11.7));
      float particleRandom3 = hash(vec2(u_randomSeed + particleId * 31.0, particleId * 13.1));
      
      float driftSpeed1 = 0.3 + particleRandom1 * 0.4;
      float driftSpeed2 = 0.2 + particleRandom2 * 0.3;
      
      vec2 particlePos = vec2(
        particleRandom1 + sin(u_time * driftSpeed1 + particleRandom3 * 6.28) * 0.1,
        particleRandom2 + cos(u_time * driftSpeed2 + particleRandom3 * 6.28) * 0.08
      );
      
      // Gravitational attraction to shadow
      vec2 particleWorldPos = u_tileGridPos + particlePos;
      vec2 toShadow = u_shadowPos - particleWorldPos;
      float shadowDist = length(toShadow);
      
      if (shadowDist < 4.0) {
        float gravityStrength = 0.08 / max(shadowDist, 0.5);
        float gravityFalloff = 1.0 - smoothstep(0.0, 4.0, shadowDist);
        vec2 gravityPull = normalize(toShadow) * gravityStrength * gravityFalloff;
        particlePos += gravityPull * particleRandom3;
      }
      
      particlePos = mod(particlePos, 1.0);
      float particleDist = distance(v_texCoord, particlePos);
      float particle = exp(-particleDist * 60.0);
      float particleGlow = exp(-particleDist * 25.0);
      
      vec3 particleColor = mix(vec3(0.4, 0.7, 1.0), vec3(0.8, 0.5, 1.0), particleRandom3);
      baseColor += particleColor * particle * 0.8;
      baseColor += particleColor * particleGlow * 0.15;
    }
    
    // Network energy lines
    for (int i = 0; i < 10; i++) {
      float lineId = float(i);
      float lineRandom = hash(vec2(u_randomSeed + lineId * 40.0, lineId * 17.0));
      
      float lineProgress = fract(u_time * (0.1 + lineRandom * 0.1) + lineRandom);
      vec2 lineStart = vec2(lineRandom, fract(lineRandom * 1.7));
      vec2 lineEnd = vec2(fract(lineRandom * 2.3), fract(lineRandom * 3.1));
      
      vec2 linePos = mix(lineStart, lineEnd, lineProgress);
      float lineDist = distance(v_texCoord, linePos);
      float line = exp(-lineDist * 80.0) * smoothstep(0.0, 0.3, lineProgress) * smoothstep(1.0, 0.7, lineProgress);
      
      vec3 lineColor = vec3(0.2, 0.8, 1.0);
      baseColor += lineColor * line * 0.4;
    }
    
    // Mathematical web grid
    vec2 tileWorldPos = u_tileGridPos + v_texCoord;
    vec2 toPlayer = u_shadowPos - tileWorldPos;
    float playerDistance = length(toPlayer);
    
    float vibrationStrength = 1.0 - smoothstep(0.0, 5.0, playerDistance);
    float vibrationFreq = u_time * 2.0 + playerDistance * 0.5;
    float vibration = sin(vibrationFreq) * vibrationStrength * 0.02;
    
    vec2 webCoord = v_texCoord + vibration;
    float gridSpacing = 0.15;
    vec2 gridPos = webCoord / gridSpacing;
    vec2 gridFract = fract(gridPos);
    
    float lineWidth = 0.05 + vibrationStrength * 0.03 + playerDistance * 100000.;
    float hLine = smoothstep(lineWidth, 0.0, abs(gridFract.y - 0.5));
    float vLine = smoothstep(lineWidth, 0.0, abs(gridFract.x - 0.5));
    
    vec2 diagCoord1 = webCoord * 1.414;
    float diagPos1 = (diagCoord1.x + diagCoord1.y) / gridSpacing;
    float diagFract1 = fract(diagPos1);
    float dLine1 = smoothstep(lineWidth * 0.7, 0.0, abs(diagFract1 - 0.5));
    
    float diagPos2 = (diagCoord1.x - diagCoord1.y) / gridSpacing;
    float diagFract2 = fract(diagPos2);
    float dLine2 = smoothstep(lineWidth * 0.7, 0.0, abs(diagFract2 - 0.5));
    
    float webLines = max(max(hLine, vLine), max(dLine1, dLine2) * 0.6);
    
    vec2 nodeCoord = fract(webCoord / gridSpacing);
    float nodeDistance = length(nodeCoord - 0.5);
    float nodes = smoothstep(0.08, 0.04, nodeDistance);
    
    float nodePulse = sin(u_time * 4.0 - playerDistance * 2.0) * 0.5 + 0.5;
    nodes *= (1.0 + vibrationStrength * nodePulse * 0.8);
    
    vec3 webColor = mix(vec3(0.2, 0.4, 0.8), vec3(0.4, 0.8, 1.0), vibrationStrength);
    float pulsePhase = u_time * 1.5 + hash(u_tileGridPos) * 6.28;
    float pulse = sin(pulsePhase) * 0.3 + 0.7;
    
    baseColor += webColor * (webLines * 0.3 + nodes * 0.6) * pulse;
    
    // Static grid outlines
    float borderX = min(smoothstep(0.0, 0.008, v_texCoord.x), smoothstep(0.0, 0.008, 1.0 - v_texCoord.x));
    float borderY = min(smoothstep(0.0, 0.008, v_texCoord.y), smoothstep(0.0, 0.008, 1.0 - v_texCoord.y));
    float border = 1.0 - (borderX * borderY);
    
    vec3 borderColor = neonPink * 0.6;
    baseColor += borderColor * border * 0.3;
    
    // Trail step count display
    if (u_trailStepCount >= 0.0) {
      float numDigitsInTrailCount = 1.0;
      if (u_trailStepCount > 9.0) numDigitsInTrailCount = 1.7;
      if (u_trailStepCount > 99.0) numDigitsInTrailCount = 3.0;
      
      float size = 0.3;
      float xOffset = 0.52 - size/2.0 - size*(numDigitsInTrailCount-1.0)/2.0;
      float yOffset = 0.5 - size/2.0;
      float trailNumber = renderNumber(v_texCoord, u_trailStepCount, vec2(xOffset, yOffset), size);
      if (trailNumber > 0.5) {
        baseColor = mix(baseColor, vec3(1.0, 0.8, 0.0), 1.0);
      }
    }
    
    return baseColor;
  }
`;

// Wall tile shader
export const wallTileShader = `
  vec3 renderWallTile() {
    vec3 baseColor = vec3(0.0, 0.0, 0.0); // Solid black base
    
    vec2 shadowWorldPos = u_shadowPos;
    vec2 fragmentToShadow = shadowWorldPos - u_tileGridPos;
    float shadowDistance = length(fragmentToShadow);
    float wallProximity = 1.0 - smoothstep(0.0, 1.5, shadowDistance);
    
    if (wallProximity > 0.1) {
      vec3 wallBorderColor = vec3(1.0, 0.2, 0.2); // Red border
      float wallBorderWidth = mix(0.05, .15, wallProximity) + sin(u_time*2.0)*0.05;
      float wallIntensity = 5.0+wallProximity * sin(u_time*4.0)*10.0;
      
      vec2 wallCenter = u_tileGridPos + vec2(0.5, 0.5);
      vec2 playerPos = u_shadowPos + vec2(0.5, 0.5);
      
      vec2 diff = playerPos - wallCenter;
      float absX = abs(diff.x);
      float absY = abs(diff.y);
      
      if (absX > absY) {
        if (diff.x > 0.0) {
          // Right border
          float rightBorder = 1.0 - smoothstep(0.0, wallBorderWidth, 1.0 - v_texCoord.x);
          baseColor += wallBorderColor * rightBorder * wallIntensity;
        } else {
          // Left border
          float leftBorder = 1.0 - smoothstep(0.0, wallBorderWidth, v_texCoord.x);
          baseColor += wallBorderColor * leftBorder * wallIntensity;
        }
      } else {
        if (diff.y > 0.0) {
          // Bottom border
          float bottomBorder = 1.0 - smoothstep(0.0, wallBorderWidth, 1.0 - v_texCoord.y);
          baseColor += wallBorderColor * bottomBorder * wallIntensity;
        } else {
          // Top border
          float topBorder = 1.0 - smoothstep(0.0, wallBorderWidth, v_texCoord.y);
          baseColor += wallBorderColor * topBorder * wallIntensity;
        }
      }
    }
    
    return baseColor;
  }
`;

// Player tile shader
export const playerTileShader = `
  vec3 renderPlayerTile() {
    vec2 center = vec2(0.5);
    
    // Apply rotation shake transformation
    vec2 texCoord = v_texCoord;
    float shakeDuration = 0.6; // Shake for 0.6 seconds
    
    if (u_playerCompleteTime > 0.0 && u_playerCompleteTime < shakeDuration) {
      // Rotation-based wobble shake
      float fadeOut = 1.0 - (u_playerCompleteTime / shakeDuration);
      fadeOut = fadeOut * fadeOut; // Quadratic fade for smoother ending
      
      // Use completion time for shake timing
      float shakeTime = u_playerCompleteTime * 20.0;
      
      // Multi-frequency rotation for chaotic wobble
      float rotation = sin(shakeTime) * 0.15 * fadeOut;
      rotation += sin(shakeTime * 1.7) * 0.08 * fadeOut * 15.0;
      rotation += sin(shakeTime * 2.3) * 0.05 * fadeOut;
      
      // Apply rotation around center
      texCoord -= center;
      vec2 rotatedCoord = vec2(
        cos(rotation) * texCoord.x - sin(rotation) * texCoord.y,
        sin(rotation) * texCoord.x + cos(rotation) * texCoord.y
      );
      texCoord = rotatedCoord + center;
    }
    
    vec2 uv = texCoord - center;
    float dist = length(uv);
    
    // Calculate rounded corners mask
    float cornerRadius = 0.08; // Same radius as movable blocks
    float rectDist = sdRoundedRect(uv, vec2(0.5 - cornerRadius), cornerRadius);
    float roundedMask = 1.0 - smoothstep(-0.005, 0.005, rectDist);
    
    // Early exit for pixels outside rounded rectangle
    if (roundedMask < 0.01) {
      discard;
    }
    
    vec3 baseColor = vec3(0.0);
    
    // Base player color
    baseColor += neonPink;
    
    // Energy core
    float core = 1.0 - smoothstep(0.03, 0.06, dist);
    float innerGlow = 1.0 - smoothstep(0.06, 0.12, dist);
    
    baseColor += hologramWhite * core * 2.5;
    baseColor += neonPink * innerGlow * 0.8;
    
    // Orbiting particles
    for (int i = 0; i < 8; i++) {
      float particleId = float(i);
      float angle = particleId * 3.141/2.0 + cos(u_time * 1.0);
      float radius = 0.01 + sin(u_time * 3.0 + particleId) * 0.2;
      
      vec2 particlePos = vec2(cos(angle), sin(angle)) * radius;
      float particleDist = distance(uv, particlePos);
      
      float particle = exp(-particleDist * 25.0);
      float pulse = 0.28 + sin(u_time * 4.0 + particleId * 0.5) * 0.92;
      
      vec3 particleColor = mix(brightCyan, hologramWhite, pulse);
      baseColor += particleColor * particle * 0.8;
    }
    
    // Step count display
    float numDigitsInStepCount = 1.0;
    if (u_currentStepCount > 9.0) numDigitsInStepCount = 1.7;
    if (u_currentStepCount > 99.0) numDigitsInStepCount = 3.0;
    if (u_currentStepCount > 999.0) numDigitsInStepCount = 4.0;
    
    float size = 0.3;
    float xOffset = 0.55 - size/2.0 - size*(numDigitsInStepCount-1.0)/2.0;
    float yOffset = 0.5 - size/2.0;
    float isOutline = 0.0;
    float stepNumber = renderNumberReadable(texCoord, u_currentStepCount, vec2(xOffset, yOffset), size, isOutline);
    
    if (stepNumber > 0.5) {
      if (isOutline > 0.5) {
        baseColor = mix(baseColor, vec3(1.0, 1.0, 1.0), 1.0);
      } else {
        baseColor = mix(baseColor, vec3(0.0, 0.0, 0.0), 1.0);
      }
    }
    
    // Apply rounded mask
    baseColor *= roundedMask;
    
    if (length(baseColor) < 0.3) {
      discard;
    }
    
    return baseColor;
  }
`;

// Exit tile shader
export const exitTileShader = `
  vec3 renderExitTile() {
    vec2 center = vec2(0.5);
    vec2 uv = v_texCoord - center;
    
    vec3 starField = generateStarField(v_texCoord, u_time);
    vec3 reflection = generateReflection(v_texCoord, u_time);
    vec3 baseColor = starField * 0.8 + reflection;
    
    vec2 shadowWorldPos = u_shadowPos;
    vec2 fragmentToShadow = shadowWorldPos - u_tileGridPos;
    float shadowDistance = length(fragmentToShadow);
    float shadowProximity = 1.0 - smoothstep(0.0, 2.0, shadowDistance);
    
    // Sparking particles when player is nearby
    if (shadowProximity > 0.1) {
      for (int i = 0; i < 8; i++) {
        float sparkId = float(i);
        float sparkRandom = hash(vec2(u_randomSeed + sparkId * 10.0, sparkId * 5.3));
        float sparkAngle = sparkId * 0.785398 + u_time * (2.0 + sparkRandom) + sparkRandom * 6.28;
        float sparkSpeed = 0.1 + sparkId * 0.01 + sparkRandom * 0.05;
        float sparkTime = fract(u_time * (6.0 + sparkRandom * 2.0) + sparkId * 0.1 + sparkRandom);
        
        vec2 sparkPos = vec2(cos(sparkAngle), sin(sparkAngle)) * sparkSpeed * sparkTime;
        float sparkDistance = distance(uv, sparkPos);
        float spark = exp(-sparkDistance * 25.0);
        float sparkBrightness = (1.0 - sparkTime) * shadowProximity * 3.0;
        
        baseColor += hologramWhite * spark * sparkBrightness;
      }
      
      // Flying sparks with gravity
      for (int i = 0; i < 50; i++) {
        float flyId = float(i);
        float flyRandom = hash(vec2(u_randomSeed + flyId * 20.0, flyId * 7.1));
        float flyAngle = flyId * 0.314159 + u_time * (6.0 + flyRandom * 2.0) + flyRandom * 6.28;
        float flyDist = sin(u_time * (4.0 + flyRandom) + flyId + flyRandom * 3.14) * (0.25 + flyRandom * 0.15);
        
        vec2 flyPos = vec2(cos(flyAngle), sin(flyAngle)) * flyDist;
        
        vec2 currentFragmentWorldPos = u_tileGridPos + (v_texCoord - 0.5);
        float shadowDist = length(shadowWorldPos - currentFragmentWorldPos);
        
        float sparkGravityStrength = 0.44 / max(shadowDist, 0.3);
        float sparkGravityRange = 3.5;
        float sparkGravityFalloff = 1.0 - smoothstep(0.0, sparkGravityRange, shadowDist);
        
        vec2 sparkGravityDirection = normalize(fragmentToShadow) * sparkGravityStrength * sparkGravityFalloff;
        flyPos += sparkGravityDirection * 0.6;
        
        float flyDistance = distance(uv, flyPos);
        float flySpark = exp(-flyDistance * 30.0);
        float sparkIntensity = shadowProximity * 2.0 * (1.0 + sparkGravityFalloff * 0.5);
        
        baseColor += neonPurple * flySpark * sparkIntensity;
      }
    }
    
    // Ambient energy particles
    for (int i = 0; i < 50; i++) {
      float ambientId = float(i);
      float ambientRandom = hash(vec2(u_randomSeed + ambientId * 30.0, ambientId * 11.7));
      float ambientAngle = ambientId * 0.392699 + u_time * (0.8 + ambientRandom * 0.4) + ambientRandom * 6.28;
      float ambientDist = 0.2 + sin(u_time * (1.1 + ambientRandom * 0.3) + ambientId + ambientRandom * 3.141) * (0.08 + ambientRandom * 0.03);
      
      vec2 ambientPos = vec2(cos(ambientAngle), sin(ambientAngle)) * ambientDist;
      
      vec2 currentFragmentWorldPos = u_tileGridPos + (v_texCoord - 0.5);
      float shadowDist = length(shadowWorldPos - currentFragmentWorldPos);
      
      float ambientGravityStrength = 0.95 / max(shadowDist*shadowDist, 0.18);
      float ambientGravityRange = 2.5;
      float ambientGravityFalloff = 1.0 - smoothstep(0.0, ambientGravityRange, shadowDist);
      
      vec2 ambientGravityDirection = normalize(fragmentToShadow) * ambientGravityStrength * ambientGravityFalloff;
      ambientPos += ambientGravityDirection * 0.3;
      
      float ambientDistance = distance(uv, ambientPos);
      float ambient = exp(-ambientDistance * 18.0);
      float ambientIntensity = 0.8 + ambientGravityFalloff * 0.4;
      
      baseColor += brightCyan * ambient * ambientIntensity;
    }
    
    baseColor += vec3(1.0, 1.0, 1.0) * 0.1;
    
    // Goal step count display
    float size = 0.3;
    float numDigitsInGoalCount = 1.0;
    if (u_goalStepCount > 9.0) numDigitsInGoalCount = 1.7;
    if (u_goalStepCount > 99.0) numDigitsInGoalCount = 3.0;
    
    float xOffset = 0.56 - size/2.0 - size*(numDigitsInGoalCount-1.0)/2.0;
    float yOffset = 0.5 - size/2.0;
    float goalNumber = renderNumber(v_texCoord, u_goalStepCount, vec2(xOffset, yOffset), size);
    
    if (goalNumber > 0.5) {
      baseColor = mix(baseColor, vec3(0.0, 0.0, 0.0), 1.0);
    }
    
    return baseColor;
  }
`;

// Hole tile shader
export const holeTileShader = `
  vec3 renderHoleTile() {
    vec2 holeCenter = vec2(0.5);
    vec2 toCenter = v_texCoord - holeCenter;
    float distToCenter = length(toCenter);
    
    // Calculate rounded corners mask
    float cornerRadius = 0.08; // Same radius as other blocks
    float rectDist = sdRoundedRect(toCenter, vec2(0.5 - cornerRadius), cornerRadius);
    float roundedMask = 1.0 - smoothstep(-0.005, 0.005, rectDist);
    
    // Early exit for pixels outside rounded rectangle
    if (roundedMask < 0.01) {
      discard;
    }
    
    // Gravitational lensing distortion
    float warpStrength = 0.3 * (1.0 - smoothstep(0.0, 0.5, distToCenter));
    float warpFactor = 1.0 + warpStrength * sin(u_time * 2.0) * 0.2;
    vec2 warpedCoord = holeCenter + toCenter * warpFactor;
    
    float angle = atan(toCenter.y, toCenter.x);
    float radialWarp = sin(angle * 6.0 + u_time * 3.0) * 0.02 * warpStrength;
    warpedCoord += vec2(cos(angle + 1.57), sin(angle + 1.57)) * radialWarp;
    
    float dist = distance(warpedCoord, holeCenter);
    vec3 baseColor = vec3(0.07, 0.07, 0.07);
    
    // Gravitational distortion rings
    for (int ring = 1; ring <= 12; ring++) {
      float ringRadius = float(ring) * 0.08 + sin(u_time*2.0)*0.05;
      float ringDist = abs(dist - ringRadius);
      float ringWidth = 0.015 + ringRadius * 0.05;
      
      float distortionStrength = 1.0 - ringRadius / 0.5;
      float ringEffect = smoothstep(ringWidth, 0.0, ringDist) * distortionStrength;
      
      float warpAngle = atan(warpedCoord.y - 0.5, warpedCoord.x - 0.5);
      float warpPattern = sin(warpAngle * 8.0 + u_time * 2.0 - ringRadius * 10.0) * 0.5 + 0.5;
      
      float edgeRipple = sin(distToCenter * 20.0 - u_time * 4.0) * 0.3 + 0.7;
      ringEffect *= warpPattern * edgeRipple;
      
      vec3 ringColor = mix(vec3(0.1, 0.3, 0.8), vec3(0.8, 0.3, 0.1), distortionStrength);
      baseColor += ringColor * ringEffect * 0.3;
    }
    
    // Particles being sucked in
    for (int i = 0; i < 20; i++) {
      float particleId = float(i);
      float particleRandom = hash(vec2(u_randomSeed + particleId * 17.3, particleId * 11.7));
      float particleRandom2 = hash(vec2(u_randomSeed + particleId * 23.1, particleId * 13.9));
      
      float startAngle = particleRandom * 6.28318;
      float startDistance = 0.45 + particleRandom2 * 0.05;
      
      float suctionSpeed = 0.3 + particleRandom * 0.4;
      float inwardProgress = fract(u_time * suctionSpeed + particleRandom);
      
      float currentDistance = startDistance * (1.0 - inwardProgress);
      float spiralAmount = inwardProgress * 2.0 * (particleRandom - 0.5);
      float currentAngle = startAngle + spiralAmount;
      
      vec2 particlePos = holeCenter + vec2(
        cos(currentAngle) * currentDistance,
        sin(currentAngle) * currentDistance
      );
      
      if (particlePos.x >= 0.0 && particlePos.x <= 1.0 && particlePos.y >= 0.0 && particlePos.y <= 1.0) {
        float particleDist = distance(v_texCoord, particlePos);
        float particle = exp(-particleDist * (40.0 + inwardProgress * 80.0));
        
        vec3 particleColor = mix(
          vec3(0.3, 0.7, 1.0),
          vec3(1.0, 0.8, 0.3),
          inwardProgress
        );
        
        float brightness = (0.5 + inwardProgress) * (1.0 - fract(particleRandom * 3.0) * 0.3);
        baseColor += particleColor * particle * brightness;
      }
    }
    
    // Event horizon
    float horizonRadius = 0.15;
    float horizonGlow = 1.0 - smoothstep(horizonRadius - 0.05, horizonRadius + 0.05, dist);
    baseColor += vec3(1.0, 0.4, 0.1) * horizonGlow * 1.0;
    
    float voidCore = 1.0 - smoothstep(horizonRadius * 0.6, horizonRadius, dist);
    baseColor *= (1.0 - voidCore);
    
    // Warped edge
    float edgeWarp = sin(angle * 12.0 + u_time * 4.0) * 0.05 * (1.0 - smoothstep(0.35, 0.5, distToCenter));
    float warpedEdgeDist = distToCenter + edgeWarp - 0.3;
    float warpedEdgeFade = 10.0 * smoothstep(0.5, 0.35, warpedEdgeDist);
    
    vec3 edgeColor = mix(vec3(0.02, 0.02, 0.02), baseColor, warpedEdgeFade);
    float boundaryPulse = sin(u_time * 3.0) * 0.1 + 0.9;
    baseColor = mix(vec3(0.02, 0.05, 0.08), edgeColor, boundaryPulse);
    
    // Apply rounded mask
    baseColor *= roundedMask;
    
    // Apply fade effect based on u_holeFillProgress (0.0 = full hole, 1.0 = fully faded)
    baseColor *= (1.0 - u_holeFillProgress);
    
    return baseColor;
  }
`;

// Movable block shader
export const movableBlockShader = `
  vec3 renderMovableBlock() {
    vec3 baseColor = vec3(0.0, 0.0, 0.0); // Solid black background
    
    // Calculate rounded corners mask
    vec2 center = vec2(0.5);
    vec2 p = v_texCoord - center;
    float cornerRadius = 0.08; // Adjust this value to control corner roundness
    float rectDist = sdRoundedRect(p, vec2(0.5 - cornerRadius), cornerRadius);
    
    // Create smooth alpha mask for rounded corners
    float roundedMask = 1.0 - smoothstep(-0.005, 0.005, rectDist);
    
    // Early exit for pixels outside rounded rectangle
    if (roundedMask < 0.01) {
      discard;
    }
    
    vec2 shadowWorldPos = u_shadowPos;
    vec2 fragmentToShadow = shadowWorldPos - u_tileGridPos;
    float shadowDistance = length(fragmentToShadow);
    float shadowProximity = 1.0 - smoothstep(0.0, 2.0, shadowDistance);
    
    vec2 blockMovement = (u_shadowPos - u_previousPos) * 0.015;
    float pushIntensity = 0.6 + shadowProximity * 0.4;
    
    // Directional flow particles for each push direction
    if (u_canMoveRight > 0.5) {
      for (int i = 0; i < 6; i++) {
        float particleId = float(i);
        float particleRandom = hash(vec2(u_randomSeed + particleId * 10.0, particleId * 7.1));
        float flowProgress = fract(u_time * (0.8 + particleRandom * 0.4) + particleRandom);
        
        if (flowProgress > 0.25) continue;
        
        vec2 particlePos = vec2(
          flowProgress * 0.8 + 0.1,
          0.2 + particleId * 0.1 + particleRandom * 0.2
        );
        
        float particleDist = distance(v_texCoord, particlePos);
        float particle = exp(-particleDist * 40.0);
        float brightness = (1.0 - flowProgress * 2.0) * pushIntensity;
        
        baseColor += brightCyan * particle * brightness;
      }
    }
    
    if (u_canMoveLeft > 0.5) {
      for (int i = 0; i < 6; i++) {
        float particleId = float(i);
        float particleRandom = hash(vec2(u_randomSeed + particleId * 15.0, particleId * 8.3));
        float flowProgress = fract(u_time * (0.8 + particleRandom * 0.4) + particleRandom);
        
        if (flowProgress > 0.25) continue;
        
        vec2 particlePos = vec2(
          0.9 - flowProgress * 0.8,
          0.2 + particleId * 0.1 + particleRandom * 0.2
        );
        
        float particleDist = distance(v_texCoord, particlePos);
        float particle = exp(-particleDist * 40.0);
        float brightness = (1.0 - flowProgress * 2.0) * pushIntensity;
        
        baseColor += brightCyan * particle * brightness;
      }
    }
    
    if (u_canMoveDown > 0.5) {
      for (int i = 0; i < 6; i++) {
        float particleId = float(i);
        float particleRandom = hash(vec2(u_randomSeed + particleId * 20.0, particleId * 9.7));
        float flowProgress = fract(u_time * (0.8 + particleRandom * 0.4) + particleRandom);
        
        if (flowProgress > 0.25) continue;
        
        vec2 particlePos = vec2(
          0.2 + particleId * 0.1 + particleRandom * 0.2,
          flowProgress * 0.8 + 0.1
        );
        
        float particleDist = distance(v_texCoord, particlePos);
        float particle = exp(-particleDist * 40.0);
        float brightness = (1.0 - flowProgress * 2.0) * pushIntensity;
        
        baseColor += brightCyan * particle * brightness;
      }
    }
    
    if (u_canMoveUp > 0.5) {
      for (int i = 0; i < 6; i++) {
        float particleId = float(i);
        float particleRandom = hash(vec2(u_randomSeed + particleId * 25.0, particleId * 11.1));
        float flowProgress = fract(u_time * (0.8 + particleRandom * 0.4) + particleRandom);
        
        if (flowProgress > 0.25) continue;
        
        vec2 particlePos = vec2(
          0.2 + particleId * 0.1 + particleRandom * 0.2,
          0.9 - flowProgress * 0.8
        );
        
        float particleDist = distance(v_texCoord, particlePos);
        float particle = exp(-particleDist * 40.0);
        float brightness = (1.0 - flowProgress * 2.0) * pushIntensity;
        
        baseColor += brightCyan * particle * brightness;
      }
    }
    
    // Trail particles
    vec2 trailCenter = vec2(0.5);
    vec2 uv = v_texCoord - trailCenter;
    
    for (int i = 0; i < 3; i++) {
      float trailId = float(i);
      vec2 trailPos = blockMovement/2.0 * (0.15 * 0.04);
      
      float trailDistance = distance(uv, trailPos);
      float trail = exp(-trailDistance * 12.0);
      float trailBrightness = (1.0 - trailId / 12.0) * 0.7;
      baseColor += neonBlue * trail * trailBrightness;
    }
    
    // Border rendering logic
    vec2 blockCenter = u_tileGridPos + vec2(0.5);
    vec2 playerCenter = u_shadowPos + vec2(0.5, 0.5);
    vec2 toPlayer = playerCenter - blockCenter;
    
    float playerDistance = length(toPlayer);
    bool isNearby = (playerDistance < 1.5);
    
    vec2 leftNormal = vec2(-1.0, 0.0);
    vec2 rightNormal = vec2(1.0, 0.0);
    vec2 topNormal = vec2(0.0, -1.0);
    vec2 bottomNormal = vec2(0.0, 1.0);
    
    float leftDot = dot(normalize(toPlayer), leftNormal);
    float rightDot = dot(normalize(toPlayer), rightNormal);
    float topDot = dot(normalize(toPlayer), topNormal);
    float bottomDot = dot(normalize(toPlayer), bottomNormal);
    
    float leftGlow = (isNearby && leftDot > 0.7) ? 1.2 : 1.0;
    float rightGlow = (isNearby && rightDot < -0.7) ? 1.2 : 1.0;
    float topGlow = (isNearby && topDot < -0.7) ? 1.2 : 1.0;
    float bottomGlow = (isNearby && bottomDot > 0.7) ? 1.2 : 1.0;
    
    // Wall-style proximity borders for blocked sides
    float blockDistance = distance(playerCenter, blockCenter);
    float blockProximity = 1.0 - smoothstep(0.0, 1.5, blockDistance);
    float wallProximity = 1.0 - smoothstep(0.0, 1.5, shadowDistance);
    
    if (wallProximity > 0.1) {
      vec3 wallBorderColor = vec3(1.0, 0.2, 0.2); // Red border color
      float wallBorderWidth = mix(0.05, .15, wallProximity) + sin(u_time*2.0)*0.05;
      float wallIntensity = wallProximity * sin(u_time)*10.0;
      
      vec2 wallCenter = u_tileGridPos + vec2(0.5, 0.5);
      vec2 playerPos = u_shadowPos + vec2(0.5, 0.5);
      
      vec2 diff = playerPos - wallCenter;
      float absX = abs(diff.x);
      float absY = abs(diff.y);
      
      // Highlight the border closest to the player (with rounded corners)
      if (absX > absY) {
        // Player is more to the left or right
        if (diff.x > 0.0 && u_canMoveLeft <= 0.5) { 
          // Player to the right - highlight RIGHT border only if can't move left
          float rightBorder = 1.0 - smoothstep(0.0, wallBorderWidth, 1.0 - v_texCoord.x);
          baseColor += wallBorderColor * rightBorder * wallIntensity * roundedMask;
        } else if (diff.x <= 0.0 && u_canMoveRight <= 0.5) {
          // Player to the left - highlight LEFT border only if can't move right
          float leftBorder = 1.0 - smoothstep(0.0, wallBorderWidth, v_texCoord.x);
          baseColor += wallBorderColor * leftBorder * wallIntensity * roundedMask;
        }
      } else {
        // Player is more above or below
        if (diff.y > 0.0 && u_canMoveUp <= 0.5) {
          // Player below - highlight BOTTOM border only if can't move up
          float bottomBorder = 1.0 - smoothstep(0.0, wallBorderWidth, 1.0 - v_texCoord.y);
          baseColor += wallBorderColor * bottomBorder * wallIntensity * roundedMask;
        } else if (diff.y <= 0.0 && u_canMoveDown <= 0.5) {
          // Player above - highlight TOP border only if can't move down
          float topBorder = 1.0 - smoothstep(0.0, wallBorderWidth, v_texCoord.y);
          baseColor += wallBorderColor * topBorder * wallIntensity * roundedMask;
        }
      }
    }

    // Static orange borders for pushable sides (always visible) - with rounded corners
    vec3 pushableColor = vec3(1.0, 0.6, 0.2); // Orange for pushable borders
    float pushableBorderWidth = 0.25; // Width of the border region
    float pushableSharpness = pushableBorderWidth * 0.99; // Controls sharpness - closer to borderWidth = sharper edge
    float pushableIntensity = 0.98; // Increased slightly for better contrast
    
    if (u_canMoveDown > 0.5) {
      float topBorder = 1.0 - smoothstep(pushableSharpness, pushableBorderWidth, v_texCoord.y);
      topBorder *= roundedMask; // Apply rounded mask
      baseColor = mix(baseColor, pushableColor, topBorder * pushableIntensity);
    }
    
    if (u_canMoveUp > 0.5) {
      float bottomBorder = 1.0 - smoothstep(pushableSharpness, pushableBorderWidth, 1.0 - v_texCoord.y);
      bottomBorder *= roundedMask; // Apply rounded mask
      baseColor = mix(baseColor, pushableColor, bottomBorder * pushableIntensity);
    }
    
    if (u_canMoveRight > 0.5) {
      float leftBorder = 1.0 - smoothstep(pushableSharpness, pushableBorderWidth, v_texCoord.x);
      leftBorder *= roundedMask; // Apply rounded mask
      baseColor = mix(baseColor, pushableColor, leftBorder * pushableIntensity);
    }
    
    if (u_canMoveLeft > 0.5) {
      float rightBorder = 1.0 - smoothstep(pushableSharpness, pushableBorderWidth, 1.0 - v_texCoord.x);
      rightBorder *= roundedMask; // Apply rounded mask
      baseColor = mix(baseColor, pushableColor, rightBorder * pushableIntensity);
    }
    
    // Apply final rounded mask with antialiasing
    baseColor *= roundedMask;
    
    // Apply fade-out effect when block is in a hole (being consumed)
    if (u_holeFillProgress > 0.0) {
      // Fade out the block as it gets consumed by the hole
      float fadeAlpha = 1.0 - u_holeFillProgress;
      
      // Add some distortion/warping effect as it gets sucked in
      vec2 center = vec2(0.5);
      vec2 toCenter = v_texCoord - center;
      float distToCenter = length(toCenter);
      
      // Create a spiral/swirl effect as it fades
      float swirl = u_holeFillProgress * 3.14159;
      vec2 swirlCoord = vec2(
        cos(swirl) * toCenter.x - sin(swirl) * toCenter.y,
        sin(swirl) * toCenter.x + cos(swirl) * toCenter.y
      );
      
      // Shrink towards center as it fades
      float shrinkFactor = 1.0 - u_holeFillProgress * 0.5;
      vec2 shrunkCoord = center + swirlCoord * shrinkFactor;
      
      // Apply fade and discard fully transparent pixels
      baseColor *= fadeAlpha;
      
      if (fadeAlpha < 0.01) {
        discard;
      }
    }
    
    return baseColor;
  }
`;
