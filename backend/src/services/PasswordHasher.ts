import bcrypt from 'bcrypt'

export async function hashPassword(password: string) {
	const saltRounds = 10;
	const hash = await bcrypt.hash(password, saltRounds);

	return hash;
}

export async function validatePassword(password: string, hash: string) {
	const isValid = await bcrypt.compare(password, hash);

	return isValid;
}
