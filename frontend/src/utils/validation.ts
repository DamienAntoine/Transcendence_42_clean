


export interface ValidationResult {
  valid: boolean;
  error?: string;
}


export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, error: 'Email is required' };
  }

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}


export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
}


export function validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }

  return { valid: true };
}


export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();

  if (!trimmed) {
    return { valid: false, error: 'Username is required' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be at most 20 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true };
}


export function validateDisplayName(displayName: string): ValidationResult {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return { valid: false, error: 'Display name is required' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Display name must be at most 30 characters' };
  }

  return { valid: true };
}


export function validateOTP(otp: string): ValidationResult {
  const trimmed = otp.trim();

  if (!trimmed) {
    return { valid: false, error: 'OTP code is required' };
  }

  if (!/^\d{6}$/.test(trimmed)) {
    return { valid: false, error: 'OTP must be exactly 6 digits' };
  }

  return { valid: true };
}


export function validateTournamentName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Tournament name is required' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Tournament name must be at least 3 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Tournament name must be at most 50 characters' };
  }

  return { valid: true };
}


export function validatePositiveNumber(value: string | number, fieldName: string = 'Value'): ValidationResult {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (num <= 0) {
    return { valid: false, error: `${fieldName} must be positive` };
  }

  return { valid: true };
}


export function validateNumberRange(
  value: string | number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): ValidationResult {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }

  return { valid: true };
}


export function validateNotEmpty(value: string, fieldName: string = 'Field'): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
}


export function validateURL(url: string): ValidationResult {
  const trimmed = url.trim();

  if (!trimmed) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(trimmed);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
