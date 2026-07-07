# How to Run the Alumni Networking Site

## Quick Start Guide

### Prerequisites
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- A web browser (Chrome, Firefox, Safari, or Edge)

---

## Step 1: Open Terminal/Command Prompt

### Windows:
- Press `Win + R`
- Type `cmd` or `powershell`
- Press Enter

### Mac/Linux:
- Press `Cmd + Space` (Mac) or `Ctrl + Alt + T` (Linux)
- Type `terminal`
- Press Enter

---

## Step 2: Navigate to Project Directory

```bash
c
```

---

## Step 3: Install Dependencies (First Time Only)

If this is your first time running the project, install the required packages:

```bash
npm install
```

This will take a few minutes to download all dependencies.

---

## Step 4: Start the Development Server

```bash
npm run dev
```

Wait for the server to start. You'll see a message like:

```
✓ Ready in 2s
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

---

## Step 5: Open the Site in Your Browser

### Option 1: Automatic
- The site may open automatically in your default browser

### Option 2: Manual
1. Open your web browser
2. Type in the address bar: `http://localhost:3000`
3. Press Enter

---

## 🎉 You're All Set!

The alumni networking site should now be running. You can:

- **Sign Up**: Create a new account at `/signup`
- **Log In**: Access your account at `/login`
- **Explore**: Browse posts, jobs, network, and messages

---

## Stopping the Server

To stop the development server:

1. Go back to your terminal/command prompt
2. Press `Ctrl + C`
3. Confirm if prompted

---

## Troubleshooting

### Port Already in Use
If you see an error about port 3000 being in use:

```bash
# Kill the process on port 3000 (Windows)
npx kill-port 3000

# Then run dev again
npm run dev
```

### Module Not Found Errors
If you see module errors:

```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

### Firebase Connection Issues
- Check your internet connection
- Verify Firebase credentials in `src/lib/firebase-config.ts`

---

## Available URLs

Once the server is running, you can access:

- **Home**: http://localhost:3000/
- **Login**: http://localhost:3000/login
- **Sign Up**: http://localhost:3000/signup
- **Profile**: http://localhost:3000/profile
- **Network**: http://localhost:3000/network
- **Jobs**: http://localhost:3000/jobs
- **Messages**: http://localhost:3000/messages
- **Events**: http://localhost:3000/events

---

## Production Build (Optional)

To create a production-ready build:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

---

## Need Help?

- Check the console/terminal for error messages
- Ensure all dependencies are installed
- Make sure you're in the correct directory
- Verify Node.js is installed: `node --version`

---

**Happy Networking! 🚀**
