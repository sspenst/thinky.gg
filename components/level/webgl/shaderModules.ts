// Shared shader utilities and functions
export const shaderUtils = `
  // Hash function for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  // Signed distance function for rounded rectangle
  float sdRoundedRect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
  }
  
  // Generate starry cosmic pattern for tiles
  vec3 generateStarField(vec2 uv, float time) {
    vec3 starField = vec3(0.02, 0.03, 0.08); // Deep space blue
    
    for (int i = 0; i < 12; i++) {
      float starId = float(i);
      vec2 starPos = vec2(
        hash(vec2(starId, 1.0)),
        hash(vec2(starId, 2.0))
      );
      
      float starDist = distance(uv, starPos);
      float twinkle = sin(time * (2.0 + starId * 0.5)) * 0.4 + 0.6;
      float star = exp(-starDist * 80.0) * twinkle;
      
      vec3 starColor = mix(vec3(0.8, 0.9, 1.0), vec3(0.4, 0.7, 1.0), hash(vec2(starId, 3.0)));
      starField += starColor * star * 0.8;
    }
    
    float nebula1 = hash(uv * 3.0 + time * 0.1) * 0.3;
    float nebula2 = hash(uv * 5.0 - time * 0.15) * 0.2;
    starField += vec3(0.2, 0.1, 0.4) * nebula1;
    starField += vec3(0.1, 0.3, 0.6) * nebula2;
    
    return starField;
  }
  
  // Generate reflective floor effect
  vec3 generateReflection(vec2 uv, float time) {
    float reflectionStrength = smoothstep(0.3, 1.0, uv.y) * 0.4;
    
    float streak1 = sin(uv.x * 20.0 + time) * 0.5 + 0.5;
    float streak2 = sin(uv.x * 30.0 - time * 1.5) * 0.5 + 0.5;
    
    vec3 reflection = vec3(0.1, 0.2, 0.4) * reflectionStrength;
    reflection += vec3(0.0, 0.4, 0.8) * streak1 * streak2 * reflectionStrength * 0.3;
    
    return reflection;
  }
  
  // Apply motion blur effect
  vec3 applyMotionBlur(vec3 baseColor, vec2 uv, vec2 velocity, float strength) {
    if (length(velocity) < 0.01 || strength < 0.01) {
      return baseColor;
    }
    
    vec3 blurredColor = baseColor;
    vec2 blurDirection = normalize(velocity) * strength * 0.05;
    
    for (int i = 1; i <= 8; i++) {
      float offset = float(i) / 8.0;
      vec2 sampleUV = uv - blurDirection * offset;
      
      if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
        float falloff = 1.0 - offset;
        blurredColor += baseColor * falloff * 0.15;
      }
    }
    
    return blurredColor;
  }
`;

// Number rendering utilities
export const numberRenderingUtils = `
  // Bitmap font rendering function for digits 0-9
  float renderDigit(vec2 uv, float digit) {
    vec2 duv = fract(uv * 1.0);
    float x = floor(duv.x * 5.0);
    float y = floor(duv.y * 7.0);
    float result = 0.0;
    
    if (digit < 0.5) { // 0
      if ((y == 0.0 && x >= 1.0 && x <= 3.0) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0) ||
          ((y >= 1.0 && y <= 5.0) && (x == 0.0 || x == 4.0))) {
        result = 1.0;
      }
    } else if (digit < 1.5) { // 1
      if ((y == 0.0 && x == 2.0) ||
          (y == 1.0 && (x == 1.0 || x == 2.0)) ||
          ((y >= 2.0 && y <= 5.0) && x == 2.0) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0)) {
        result = 1.0;
      }
    } else if (digit < 2.5) { // 2
      if ((y == 0.0 && x >= 1.0 && x <= 3.0) ||
          (y == 1.0 && (x == 0.0 || x == 4.0)) ||
          (y == 2.0 && x == 4.0) ||
          (y == 3.0 && x == 3.0) ||
          (y == 4.0 && x == 2.0) ||
          (y == 5.0 && x == 1.0) ||
          (y == 6.0)) {
        result = 1.0;
      }
    } else if (digit < 3.5) { // 3
      if ((y == 0.0 && x >= 1.0 && x <= 3.0) ||
          (y == 1.0 && (x == 0.0 || x == 4.0)) ||
          (y == 2.0 && x == 4.0) ||
          (y == 3.0 && x >= 2.0 && x <= 3.0) ||
          (y == 4.0 && x == 4.0) ||
          (y == 5.0 && (x == 0.0 || x == 4.0)) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0)) {
        result = 1.0;
      }
    } else if (digit < 4.5) { // 4
      if ((y == 0.0 && x == 3.0) ||
          (y == 1.0 && (x == 2.0 || x == 3.0)) ||
          (y == 2.0 && (x == 1.0 || x == 3.0)) ||
          (y == 3.0 && (x == 0.0 || x == 3.0)) ||
          (y == 4.0) ||
          ((y == 5.0 || y == 6.0) && x == 3.0)) {
        result = 1.0;
      }
    } else if (digit < 5.5) { // 5
      if ((y == 0.0) ||
          ((y == 1.0 || y == 2.0) && x == 0.0) ||
          (y == 3.0 && x <= 3.0) ||
          (y == 4.0 && x == 4.0) ||
          (y == 5.0 && (x == 0.0 || x == 4.0)) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0)) {
        result = 1.0;
      }
    } else if (digit < 6.5) { // 6
      if ((y == 0.0 && x >= 1.0 && x <= 3.0) ||
          (y == 1.0 && (x == 0.0 || x == 4.0)) ||
          (y == 2.0 && x == 0.0) ||
          (y == 3.0 && x <= 3.0) ||
          ((y >= 4.0 && y <= 5.0) && (x == 0.0 || x == 4.0)) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0)) {
        result = 1.0;
      }
    } else if (digit < 7.5) { // 7
      if ((y == 0.0) ||
          (y == 1.0 && x == 4.0) ||
          (y == 2.0 && x == 3.0) ||
          (y == 3.0 && x == 2.0) ||
          ((y >= 4.0 && y <= 6.0) && x == 1.0)) {
        result = 1.0;
      }
    } else if (digit < 8.5) { // 8
      if ((y == 0.0 && x >= 1.0 && x <= 3.0) ||
          ((y == 1.0 || y == 2.0) && (x == 0.0 || x == 4.0)) ||
          (y == 3.0 && x >= 1.0 && x <= 3.0) ||
          ((y == 4.0 || y == 5.0) && (x == 0.0 || x == 4.0)) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0)) {
        result = 1.0;
      }
    } else if (digit < 9.5) { // 9
      if ((y == 0.0 && x >= 1.0 && x <= 3.0) ||
          ((y == 1.0 || y == 2.0) && (x == 0.0 || x == 4.0)) ||
          (y == 3.0 && x >= 1.0) ||
          (y == 4.0 && x == 4.0) ||
          (y == 5.0 && (x == 0.0 || x == 4.0)) ||
          (y == 6.0 && x >= 1.0 && x <= 3.0)) {
        result = 1.0;
      }
    }
    
    return result;
  }
  
  // Render multi-digit number
  float renderNumber(vec2 uv, float number, vec2 position, float scale) {
    vec2 numberUV = (uv - position) / scale;
    
    if (numberUV.x < 0.0 || numberUV.y < 0.0 || numberUV.y > 1.0) return 0.0;
    
    float absNumber = abs(number);
    float hundreds = floor(absNumber / 100.0);
    float tens = floor(mod(absNumber, 100.0) / 10.0);
    float ones = mod(absNumber, 10.0);
    
    float digitCount = 1.0;
    if (absNumber >= 10.0) digitCount = 2.0;
    if (absNumber >= 100.0) digitCount = 3.0;
    
    float totalWidth = digitCount * 0.6;
    
    if (numberUV.x > totalWidth) return 0.0;
    
    float digitIndex = floor(numberUV.x / 0.6);
    vec2 digitUV = vec2(mod(numberUV.x, 0.6) / 0.6, numberUV.y);
    
    float result = 0.0;
    if (digitCount == 3.0) {
      if (digitIndex < 0.5) result = renderDigit(digitUV, hundreds);
      else if (digitIndex < 1.5) result = renderDigit(digitUV, tens);
      else if (digitIndex < 2.5) result = renderDigit(digitUV, ones);
    } else if (digitCount == 2.0) {
      if (digitIndex < 0.5) result = renderDigit(digitUV, tens);
      else if (digitIndex < 1.5) result = renderDigit(digitUV, ones);
    } else {
      if (digitIndex < 0.5) result = renderDigit(digitUV, ones);
    }
    
    return result;
  }
  
  // Render number with black outline
  float renderNumberReadable(vec2 uv, float number, vec2 position, float scale, out float isOutline) {
    isOutline = 0.0;
    
    float mainText = renderNumber(uv, number, position, scale);
    if (mainText > 0.5) return 1.0;
    
    float outlineRadius = 0.8 / scale;
    for (int dx = -1; dx <= 1; dx++) {
      for (int dy = -1; dy <= 1; dy++) {
        if (dx == 0 && dy == 0) continue;
        
        vec2 offset = vec2(float(dx), float(dy)) * outlineRadius;
        float outlineText = renderNumber(uv + offset, number, position, scale);
        if (outlineText > 0.5) {
          isOutline = 1.0;
          return 1.0;
        }
      }
    }
    
    return 0.0;
  }
`;

// Color palette definitions
export const colorPalette = `
  vec3 neonPink = vec3(1.0, 0.3, 0.8);
  vec3 neonPurple = vec3(0.8, 0.2, 1.0);
  vec3 brightMagenta = vec3(1.0, 0.4, 1.0);
  vec3 hologramWhite = vec3(1.0, 0.9, 0.95);
  vec3 brightCyan = vec3(0.3, 1.0, 1.0);
  vec3 neonBlue = vec3(0.2, 0.6, 1.0);
  vec3 green = vec3(0.2, 1.0, 0.2);
  vec3 orange = vec3(1.0, 0.5, 0.0);
`;