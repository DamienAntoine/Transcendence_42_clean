

export const JWT_SECRET = process.env.JWT_SECRET || '';
export const EMAIL_USER = process.env.EMAIL_USER || '';
export const EMAIL_PASS = process.env.EMAIL_PASS || '';
export const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
export const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);

if (!JWT_SECRET) {
	throw new Error('JWT_SECRET must be defined in environment variables');
}

if (!EMAIL_USER || !EMAIL_PASS) {
	console.warn('⚠️  WARNING: EMAIL_USER or EMAIL_PASS not set. 2FA email feature will not work.');
}
