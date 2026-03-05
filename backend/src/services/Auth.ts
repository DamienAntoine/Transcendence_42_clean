import { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '../config/env';

export function getUserIdFromRequest(req: FastifyRequest): number | null {
	const authHeader = req.headers['authorization'];
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	const token = authHeader.split(' ')[1];
	try {
		const payload = jwt.verify(token, JWT_SECRET) as { id: number };
		return payload.id;
	} catch {
		return null;
	}
}

export function getUserIdFromToken(token: string): number | null {
	try {
		const payload = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET) as { id: number };
		return payload.id;
	} catch {
		return null;
	}
}
