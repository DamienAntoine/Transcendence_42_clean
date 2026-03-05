#!/bin/bash



ENV_FILE="/app/.env"


if [ -f "$ENV_FILE" ]; then
    echo ".env file already exists, skipping generation"
else
    echo "Generating .env file with random JWT_SECRET..."


    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)


    cat > "$ENV_FILE" << EOF

JWT_SECRET=$JWT_SECRET



EMAIL_USER=noreply.transc.42@gmail.com
EMAIL_PASS=your app password (at https://myaccount.google.com/security)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EOF

    echo ".env file created successfully!"
    echo "⚠️  WARNING: Please update EMAIL_USER and EMAIL_PASS with your actual credentials!"
fi
