import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT } from '../../config/env';

export async function sendOtpEmail(email: string, otp: string) {
	const transporter = nodemailer.createTransport({
		host: EMAIL_HOST,
		port: EMAIL_PORT,
		secure: false,
		auth: {
			user: EMAIL_USER,
			pass: EMAIL_PASS
		}
	});

	await transporter.sendMail({
		from: `"Transcendence" <${EMAIL_USER}>`,
		to: email,
		subject: 'Your 2FA one time code',
		text: `Your one time code : ${otp}`
	});
}
