# Transcendence - Real-Time Pong Platform

A modern web-based Pong game platform with real-time multiplayer, tournaments, chat, and social features.

## Features

- **Real-time Multiplayer Pong** with WebSocket communication
- **Tournament System** with bracket management
- **Matchmaking** with ELO ranking
- **Custom Matches** with configurable game settings (paddle size, speed, power-ups)
- **Social Features**: Friends system, online status, direct messages
- **User Profiles** with avatar upload and statistics
- **Live Chat** with public rooms and private messaging
- **Two-Factor Authentication** via email
- **Match History** with detailed statistics
- **Leaderboard** with global rankings

## Prerequisites

- Docker & Docker Compose
- Git

## First-Time Setup

### 1. Clone the Repository

```bash
git clone https://github.com/DamienAntoine/Transcendence.git
cd Transcendence
```

### 2. Generate SSL Certificates

Generate shared SSL certificates for both frontend and backend:

```bash
./init-certs.sh
```

This creates self-signed certificates that will be used by both services.

### 3. Build and Run

Simply run Docker Compose:

```bash
sudo docker compose up --build
```

Wait for both services to start. You should see:
```
frontend-1  |   ➜  Local:   https://localhost:5173/
frontend-1  |   ➜  Network: https://172.19.0.X:5173/
backend-1   |   Server listening at https://127.0.0.1:3000
```

### 4. Access the Application

**From the same machine:**
```
https://localhost:5173
```

**⚠️ First Access - Accept SSL Certificates:**

Since we use self-signed certificates for development, your browser will show a security warning:

1. Open `https://localhost:3000` in your browser
   - Click "Advanced" → "Accept the risk and continue"
2. Open `https://localhost:5173` in your browser
   - Click "Advanced" → "Accept the risk and continue"
3. You're ready to use the application!

**From the same machine (old HTTP method):**
```
http://localhost:5173
```

**From other devices on the same network:**
```
http://192.168.1.X:5173
```
(Replace X with your actual IP address shown in the logs)

---

## Optional: Enable Two-Factor Authentication

By default, 2FA is **disabled**. If you want to enable email-based 2FA:

### Step 1: Create a Gmail Account for the Application

1. Create a new Gmail account (recommended): `noreply.yourproject@gmail.com`
2. Enable 2-Step Verification in Google Account settings
3. Generate an "App Password":
   - Go to https://myaccount.google.com/security
   - Navigate to "App passwords"
   - Generate a new password for "Mail"
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 2: Stop the Containers

```bash
sudo docker compose down
```

### Step 3: Edit the `.env` File

Open `backend/.env` and update the email configuration:

```env
# JWT Secret Key - Auto-generated (DO NOT MODIFY)
JWT_SECRET=your-auto-generated-key-here

# Email Configuration for 2FA
EMAIL_USER=noreply.yourproject@gmail.com
EMAIL_PASS=your-16-char-app-password-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

**Important:**
- Keep the `JWT_SECRET` unchanged (it was auto-generated securely)

### Step 4: Restart the Application

```bash
sudo docker compose up
```

**2FA is now enabled!** Users can activate it in their profile settings.

---

## Project Structure

```
.
├── backend/              # Node.js + Fastify backend
│   ├── src/
│   │   ├── users/       # User management & authentication
│   │   ├── pong/        # Game logic & WebSocket handlers
│   │   ├── tournament/  # Tournament system
│   │   ├── chat/        # Chat & messaging
│   │   └── config/      # Environment configuration
│   ├── data/            # SQLite database & avatars (ignored by Git)
│   └── .env             # Environment variables (auto-generated)
│
├── frontend/            # Vite + TypeScript SPA
│   ├── src/
│   │   ├── pages/       # Application pages
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # API & WebSocket services
│   │   └── router/      # Client-side routing
│   └── public/
│
└── docker-compose.yml   # Docker orchestration
```

## How to Play

### Quick Match
1. **Register/Login** on the homepage
2. Go to **Pong Menu** → **Matchmaking**
3. Wait for an opponent
4. Play! Use **Arrow Keys** to move your paddle

### Custom Match
1. Go to **Friends** page
2. Click the **🎮 Challenge** button next to a friend
3. Configure game settings (paddle size, speed, power-ups)
4. Send the invitation
5. Your friend accepts and the match starts!

### Tournament
1. Go to **Tournaments** page
2. **Create** a new tournament or **Join** an existing one
3. Wait for all players to join
4. **Start** the tournament (creator only)
5. Play your matches according to the bracket

## Development Commands

### View Logs
```bash
# All services
sudo docker compose logs -f

# Backend only
sudo docker compose logs -f backend

# Frontend only
sudo docker compose logs -f frontend
```

### Restart Services
```bash
# Restart all
sudo docker compose restart

# Restart backend only
sudo docker compose restart backend
```

### Stop Services
```bash
sudo docker compose down
```

### Rebuild After Code Changes
```bash
sudo docker compose up --build
```

### Clean Everything (including volumes)
```bash
sudo docker compose down -v
```

## Database

The application uses **SQLite** for data persistence:
- Location: `backend/Transcendence.db`
- **Automatically created** on first run
- **Not tracked by Git** (in `.gitignore`)

To reset the database, simply delete `backend/Transcendence.db` and restart.

## User Avatars

Avatar uploads are stored in:
- Location: `backend/data/avatars/`
- **Not tracked by Git** (in `.gitignore`)
- Supported formats: PNG, JPG, JPEG, GIF
- Max size: 10MB

## Environment Variables

### Automatically Generated
- `JWT_SECRET` - 64-character random key for JWT signing

### Optional Configuration
- `EMAIL_USER` - SMTP username (Gmail address)
- `EMAIL_PASS` - SMTP password (Gmail App Password)
- `EMAIL_HOST` - SMTP server (default: `smtp.gmail.com`)
- `EMAIL_PORT` - SMTP port (default: `587`)

## Security Notes

- **JWT_SECRET** is auto-generated with cryptographically secure randomness
- **Never commit** the `.env` file (already in `.gitignore`)
- **Use App Passwords** for Gmail, not your main password
- **Database and avatars** are excluded from version control

## Troubleshooting

### Port Already in Use
If ports 5173 or 3000 are already in use:
```bash
# Find and kill the process
sudo lsof -i :5173
sudo lsof -i :3000
# Or change ports in docker-compose.yml
```

### I see node_modules folders locally

This shouldn't happen with the current configuration. If you do:

```bash
# Remove them
rm -rf backend/node_modules frontend/node_modules

# Rebuild containers
sudo docker compose down -v
sudo docker compose up --build
```

### Database Locked Error
```bash
# Stop containers and restart
sudo docker compose down
sudo docker compose up
```

### 2FA Emails Not Sending
1. Verify `EMAIL_USER` and `EMAIL_PASS` in `backend/.env`
2. Ensure you used an App Password, not your Gmail password
3. Check backend logs: `sudo docker compose logs backend`

## Dependencies

### Backend
- Fastify - Web framework
- SQLite3 - Database
- jsonwebtoken - JWT authentication
- bcrypt - Password hashing
- ws - WebSocket support
- nodemailer - Email sending
- dotenv - Environment variables

### Frontend
- Vite - Build tool & dev server
- TypeScript - Type safety
- TailwindCSS - Styling
- Native WebSocket API - Real-time communication

## License

This project is part of the 42 School curriculum.
