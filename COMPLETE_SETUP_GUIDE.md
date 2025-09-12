# 🚀 Complete Setup Guide - GitHub + Vercel + ChatSphere

This is a complete step-by-step guide to get your ChatSphere application running with GitHub Actions and Vercel deployment.

## 📋 Prerequisites Checklist

Before we start, make sure you have:
- [ ] GitHub repository created
- [ ] Vercel account created
- [ ] Supabase project set up
- [ ] All code pushed to GitHub

---

## 🔧 Step 1: GitHub Repository Setup

### 1.1 Navigate to Your Repository
1. Go to [GitHub.com](https://github.com)
2. Sign in to your account
3. Open your ChatSphere repository

### 1.2 Add GitHub Secrets
1. Click on **Settings** tab (top menu bar)
2. In the left sidebar, click **Secrets and variables**
3. Click **Actions**

### 1.3 Add Each Secret (Click "New repository secret" for each one)

#### Secret #1: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Secret: https://tnvkyuqobuzrgsumuxtc.supabase.co
```

#### Secret #2: VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Secret: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
```

#### Secret #3: VITE_SUPABASE_SECRET_KEY
```
Name: VITE_SUPABASE_SECRET_KEY
Secret: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
```

#### Secret #4: SUPABASE_PROJECT_ID
```
Name: SUPABASE_PROJECT_ID
Secret: tnvkyuqobuzrgsumuxtc
```

### 1.4 Verify Your Secrets
Your GitHub Secrets should look like this:
```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY  
✅ VITE_SUPABASE_SECRET_KEY
✅ SUPABASE_PROJECT_ID
```

---

## 🚀 Step 2: Vercel Project Setup

### 2.1 Connect GitHub to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"New Project"**
4. Import your ChatSphere repository
5. Click **"Import"**

### 2.2 Configure Vercel Project Settings
1. **Project Name**: Keep as "ChatSphere" or rename as desired
2. **Framework Preset**: Select "Vite"
3. **Root Directory**: Leave as "./"
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Click **"Deploy"**

### 2.3 Add Environment Variables in Vercel
1. Go to your project dashboard
2. Click **Settings** tab
3. Click **Environment Variables** in left sidebar
4. Add each variable:

#### Variable #1: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: https://tnvkyuqobuzrgsumuxtc.supabase.co
Environment: Production, Preview, Development
```

#### Variable #2: VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Value: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
Environment: Production, Preview, Development
```

#### Variable #3: VITE_SUPABASE_SECRET_KEY
```
Name: VITE_SUPABASE_SECRET_KEY
Value: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
Environment: Production, Preview, Development
```

#### Variable #4: SUPABASE_PROJECT_ID
```
Name: SUPABASE_PROJECT_ID
Value: tnvkyuqobuzrgsumuxtc
Environment: Production, Preview, Development
```

### 2.4 Get Vercel Project Information
1. Go to **Settings** → **General**
2. Note down your **Project ID** (you'll need this)
3. Note down your **Team ID** (if applicable)

---

## 🔗 Step 3: Get Vercel Deploy Webhook

### 3.1 Create Deploy Hook
1. In Vercel, go to **Settings** → **Git**
2. Scroll down to **Deploy Hooks**
3. Click **"Create Hook"**
4. Configure:
   ```
   Name: GitHub Actions Deploy
   Git Branch: main
   ```
5. Click **"Create Hook"**
6. **Copy the webhook URL** (it should look like your provided URL)

### 3.2 Update GitHub Actions Workflow
Your webhook URL is already configured in `.github/workflows/main.yml`:
```
https://api.vercel.com/v1/integrations/deploy/prj_bbkgO4Z6sv63LWVFNCQMRt2TUAZN/0FkGTslvWG
```

---

## 🎯 Step 4: Test the Pipeline

### 4.1 Make a Test Commit
1. Make a small change to your code (add a comment)
2. Commit and push to main branch:
   ```bash
   git add .
   git commit -m "Test pipeline setup"
   git push origin main
   ```

### 4.2 Monitor GitHub Actions
1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see a workflow running called "Main CI/CD Pipeline"
4. Click on it to monitor progress

### 4.3 Check Vercel Deployment
1. Go to your Vercel dashboard
2. Go to **Deployments** tab
3. You should see a new deployment triggered
4. Wait for it to complete

---

## 🔍 Step 5: Troubleshooting

### If GitHub Actions Fails:

#### Check #1: Secrets are Added
- Go to GitHub → Settings → Secrets and variables → Actions
- Verify all 4 secrets are there with correct names

#### Check #2: Workflow File Exists
- Go to GitHub → Actions tab
- You should see "Main CI/CD Pipeline" in the list
- If not, check `.github/workflows/main.yml` exists

#### Check #3: Check Action Logs
- Click on the failed workflow
- Click on the failed job
- Read the error messages

### If Vercel Deployment Fails:

#### Check #1: Environment Variables
- Go to Vercel → Settings → Environment Variables
- Verify all variables are added for all environments

#### Check #2: Build Settings
- Go to Vercel → Settings → General
- Verify:
  - Framework: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`

#### Check #3: Check Vercel Logs
- Go to Vercel → Deployments
- Click on failed deployment
- Check the build logs

---

## ✅ Step 6: Verify Everything Works

### 6.1 Check Local Development
```bash
npm run dev
```
- Should start without errors
- Should connect to Supabase

### 6.2 Check Production Deployment
- Visit your Vercel URL
- Test authentication (sign up/sign in)
- Test creating chats and sending messages

### 6.3 Check Pipeline Flow
1. Push to main → GitHub Actions runs → Vercel deploys
2. Push to other branch → GitHub Actions runs → No Vercel deploy

---

## 🎉 Success Checklist

- [ ] GitHub repository has all 4 secrets
- [ ] Vercel project is connected to GitHub
- [ ] Vercel has all environment variables
- [ ] GitHub Actions workflow runs successfully
- [ ] Vercel deployment completes successfully
- [ ] Application works in production
- [ ] Pipeline only deploys on main branch pushes

---

## 🆘 Still Having Issues?

### Common Problems & Solutions:

#### 1. "Secrets not found" error
- Double-check secret names match exactly
- Make sure secrets are in the correct repository

#### 2. "Build failed" in Vercel
- Check environment variables are set
- Verify build command is `npm run build`

#### 3. "Webhook not triggered"
- Verify webhook URL is correct
- Check GitHub Actions completed successfully

#### 4. "Environment variables not loading"
- Restart Vercel deployment
- Check variable names have no typos

### Get Help:
1. Check GitHub Actions logs
2. Check Vercel deployment logs
3. Verify all settings match this guide exactly

---

## 📞 Quick Reference

### Your Supabase Credentials:
```
URL: https://tnvkyuqobuzrgsumuxtc.supabase.co
Anon Key: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
Secret Key: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
Project ID: tnvkyuqobuzrgsumuxtc
```

### Your Vercel Webhook:
```
https://api.vercel.com/v1/integrations/deploy/prj_bbkgO4Z6sv63LWVFNCQMRt2TUAZN/0FkGTslvWG
```

### Required GitHub Secrets:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_SECRET_KEY
- SUPABASE_PROJECT_ID

### Required Vercel Environment Variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_SECRET_KEY
- SUPABASE_PROJECT_ID

Follow this guide step by step, and your ChatSphere application will be deployed automatically! 🚀
