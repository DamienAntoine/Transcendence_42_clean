#!/bin/bash

# Script to generate shared SSL certificates for both backend and frontend

echo "🔐 Generating shared SSL certificates..."

# Check if certificates already exist in both locations
if [ -f "backend/certs/key.pem" ] && [ -f "backend/certs/cert.pem" ] && \
   [ -f "frontend/certs/key.pem" ] && [ -f "frontend/certs/cert.pem" ]; then
    echo "✅ SSL certificates already exist. Skipping generation."
    exit 0
fi

echo "📝 Creating SSL configuration..."

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Detected local IP: $LOCAL_IP"

# Create SSL config file
cat > ssl.conf << EOF
[req]
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
IP.3 = ${LOCAL_IP}
EOF

echo "🔑 Generating SSL certificates..."

# Generate shared certificates
openssl req -x509 -newkey rsa:4096 \
    -keyout shared-cert.key \
    -out shared-cert.crt \
    -days 365 \
    -nodes \
    -config ssl.conf \
    -extensions v3_req 2>/dev/null

# Create cert directories
mkdir -p backend/certs
mkdir -p frontend/certs

# Copy the SAME certificate to both locations
echo "📦 Copying shared certificates..."
cp shared-cert.key backend/certs/key.pem
cp shared-cert.crt backend/certs/cert.pem
cp shared-cert.key frontend/certs/key.pem
cp shared-cert.crt frontend/certs/cert.pem

echo "✅ Shared SSL certificates generated and installed successfully!"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
