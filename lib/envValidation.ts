/**
 * Environment validation utility
 * Validates critical environment variables at application startup
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that JWT_SECRET meets minimum security requirements
 */
function validateJwtSecret(secret: string | undefined): ValidationResult {
  const errors: string[] = [];

  if (!secret) {
    errors.push('JWT_SECRET is not defined');
    return { isValid: false, errors };
  }

  if (secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', '123456', 'your-secret-here', 'development'];
  if (weakSecrets.includes(secret.toLowerCase())) {
    errors.push('JWT_SECRET appears to be a weak/default value');
  }

  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(secret).size;
  if (uniqueChars < 10) {
    errors.push('JWT_SECRET has insufficient character diversity');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates all critical environment variables
 */
export function validateEnvironment(): ValidationResult {
  const allErrors: string[] = [];

  // Validate JWT_SECRET
  const jwtValidation = validateJwtSecret(process.env.JWT_SECRET);
  allErrors.push(...jwtValidation.errors);

  // Validate other critical environment variables
  const requiredEnvVars = [
    'MONGODB_URI'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] && process.env.NODE_ENV !== 'test') {
      allErrors.push(`${envVar} is not defined`);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Gets validated JWT_SECRET
 * This should only be called after validateEnvironment() has passed
 */
export function getValidatedJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not validated - call validateEnvironment() first');
  }
  return secret;
}

/**
 * Validates environment on application startup
 * Call this in your main application entry point
 */
export function validateEnvironmentOnStartup(): void {
  const validation = validateEnvironment();
  
  if (!validation.isValid) {
    console.error('Environment validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Running in non-production mode with invalid environment configuration');
    }
  } else {
    console.log('Environment validation passed');
  }
}