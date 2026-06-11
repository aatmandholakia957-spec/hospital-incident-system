# Hospital Incident Management System (HIMS) Deployment Guide

This guide explains why closing the terminal stops the local app, how to run it in the background locally, and how to deploy both the backend and frontend to the cloud for a permanent live website.

---

## 1. Why does the app "crash" when I close the window?

When you run `npm run dev` in your command prompt, you are starting the development servers in the foreground of that specific terminal window. 
- The window **holds the active process**.
- As soon as you close the terminal, Windows terminates all active child processes running inside it.
- This stops the frontend and backend servers immediately, which makes the website unreachable and seem like it has "crashed".

### Running it in the background locally (Optional)
If you want to keep the app running locally without keeping terminal windows open, you can use a process manager like **PM2**.
1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```
2. Start the backend:
   ```bash
   cd backend
   pm2 start server.js --name "hims-backend"
   ```
3. Start the frontend:
   ```bash
   cd ../frontend
   pm2 start npm --name "hims-frontend" -- run dev
   ```
4. PM2 will run these processes silently in the background. You can close all terminals. To see logs or stop them, run:
   ```bash
   pm2 status
   pm2 logs
   pm2 stop all
   ```

---

## 2. Deploying to a Live Website (Free Cloud Hosting)

To make HIMS a permanent public live website, you should deploy the backend to **Render** and the frontend to **Vercel**.

### Step A: Push changes to GitHub
Make sure all of the latest code changes are pushed to your GitHub repository:
1. Run the `push-to-github.bat` script in your root directory.
2. Verify that your latest commits are visible on GitHub at `https://github.com/aatmandholakia957-spec/hospital-incident-system`.

---

### Step B: Host the Backend API on Render (Free)
Render is a cloud hosting provider that can run the Node.js Express server.

1. Go to [Render](https://render.com/) and create a free account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and choose the **hospital-incident-system** repository.
4. Configure the Web Service settings:
   - **Name**: `hospital-incident-backend` (or similar)
   - **Region**: Choose the region closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Advanced** and add the following **Environment Variables**:
   - `PORT`: `10000` (Render will override this, but standard to specify)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://aatmandholakia957_db_user:Rk51x7So89SytIgW@cluster0.uytzmgt.mongodb.net/hospital_incidents?appName=Cluster0`
   - `JWT_SECRET`: `hospital_incident_jwt_secret_key_2024_ultra_secure_xyz`
   - `JWT_EXPIRE`: `24h`
   - `FRONTEND_URL`: `https://YOUR-FRONTEND-URL.vercel.app` (You will update this once you deploy the frontend)
6. Click **Create Web Service**. 
7. Once deployed, Render will provide you with a live backend URL (e.g. `https://hospital-incident-backend.onrender.com`). **Copy this URL.**

---

### Step C: Host the Frontend on Vercel (Free)
Vercel is the creator of Next.js and provides optimized, fast static and serverless hosting.

1. Go to [Vercel](https://vercel.com/) and sign up for a free Hobby account.
2. Click **Add New** -> **Project**.
3. Connect your GitHub account and import the **hospital-incident-system** repository.
4. Configure the Vercel project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click Edit, select the `frontend` folder, and click Continue.
   - **Build and Output Settings**: Keep default settings.
5. Expand the **Environment Variables** section and add:
   - `BACKEND_URL`: `https://YOUR-RENDER-BACKEND-URL.onrender.com` (Paste the URL you copied from Render)
   - `NEXT_PUBLIC_API_URL`: `https://YOUR-RENDER-BACKEND-URL.onrender.com` (Same as above)
6. Click **Deploy**.
7. Vercel will build your Next.js application and deploy it. Once done, it will give you a live website link (e.g. `https://hospital-incident-system.vercel.app`).

---

### Step D: Update the Backend CORS configuration
Now that you have your live frontend URL, you should update the backend's allowed origins:
1. Go back to your Render Dashboard for the backend service.
2. Go to **Environment** settings.
3. Change the `FRONTEND_URL` environment variable value from `http://localhost:3000` (or `https://YOUR-FRONTEND-URL.vercel.app`) to your actual Vercel live URL (e.g., `https://hospital-incident-system.vercel.app`).
4. Save and let the backend redeploy.

**Congratulations! Your application is now fully live and updated on the internet.**
