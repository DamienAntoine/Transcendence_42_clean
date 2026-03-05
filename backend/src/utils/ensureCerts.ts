import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export function ensureCertsExist(): void {
	const certsPath = path.resolve(process.cwd(), 'certs');
	const keyPath = path.join(certsPath, 'key.pem');
	const certPath = path.join(certsPath, 'cert.pem');

	// Check if certificates already exist
	if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
		console.log('✅ SSL certificates already exist.');
		return;
	}

	console.log('🔐 Generating SSL certificates...');

	// Create certs directory if it doesn't exist
	if (!fs.existsSync(certsPath)) {
		fs.mkdirSync(certsPath, { recursive: true });
	}

	// Create SSL config
	const sslConfig = `[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = FR
ST = Paris
L = Paris
O = 42
OU = Transcendence
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

	const configPath = path.join(certsPath, 'ssl.conf');
	fs.writeFileSync(configPath, sslConfig);

	try {
		// Generate certificates
		execSync(
			`openssl req -x509 -newkey rsa:4096 ` +
			`-keyout "${keyPath}" ` +
			`-out "${certPath}" ` +
			`-days 365 ` +
			`-nodes ` +
			`-config "${configPath}" ` +
			`-extensions v3_req`,
			{ stdio: 'ignore' }
		);

		// Clean up config file
		fs.unlinkSync(configPath);

		console.log('✅ SSL certificates generated successfully!');
	} catch (error) {
		console.error('❌ Failed to generate SSL certificates:', error);
		throw error;
	}
}
