# Environment Variables Setup Guide

This guide covers setting up environment variables for GitHub Actions, Vercel, and local development.

## 🔑 Supabase Credentials

Based on your provided credentials:

```
Publishable Key: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
Secret Key: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
Project ID: tnvkyuqobuzrgsumuxtc
Project URL: https://tnvkyuqobuzrgsumuxtc.supabase.co
```

## 🏠 Local Development Setup

### 1. Create Environment File

Create a `.env.local` file in your project root:

```bash
# Run the setup script (recommended)
./setup-env.sh

# Or create manually
touch .env.local
```

### 2. Environment Variables for Local Development

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tnvkyuqobuzrgsumuxtc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
VITE_SUPABASE_SECRET_KEY=sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69

# Project Information
SUPABASE_PROJECT_ID=tnvkyuqobuzrgsumuxtc

# Development
NODE_ENV=development
```

### 3. Start Development Server

```bash
npm run dev
```

## 🐙 GitHub Actions Setup

### 1. Navigate to Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables**
4. Click **Actions**

### 2. Add Repository Secrets

Click **New repository secret** and add each of these:

#### Secret 1: `VITE_SUPABASE_URL`
```
Name: VITE_SUPABASE_URL
Value: https://tnvkyuqobuzrgsumuxtc.supabase.co
```

#### Secret 2: `VITE_SUPABASE_ANON_KEY`
```
Name: VITE_SUPABASE_ANON_KEY
Value: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
```

#### Secret 3: `VITE_SUPABASE_SECRET_KEY`
```
Name: VITE_SUPABASE_SECRET_KEY
Value: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
```

#### Secret 4: `SUPABASE_PROJECT_ID`
```
Name: SUPABASE_PROJECT_ID
Value: tnvkyuqobuzrgsumuxtc
```

### 3. Verify Secrets

Your GitHub Secrets should look like this:

```
VITE_SUPABASE_URL          ✅
VITE_SUPABASE_ANON_KEY     ✅
VITE_SUPABASE_SECRET_KEY   ✅
SUPABASE_PROJECT_ID        ✅
```

## 🚀 Vercel Setup

### 1. Access Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in to your account
3. Navigate to your ChatSphere project

### 2. Add Environment Variables

1. Go to your project dashboard
2. Click on **Settings** tab
3. Click **Environment Variables** in the left sidebar

### 3. Add Each Environment Variable

Click **Add** for each variable:

#### Variable 1: `VITE_SUPABASE_URL`
```
Name: VITE_SUPABASE_URL
Value: https://tnvkyuqobuzrgsumuxtc.supabase.co
Environments: Production, Preview, Development
```

#### Variable 2: `VITE_SUPABASE_ANON_KEY`
```
Name: VITE_SUPABASE_ANON_KEY
Value: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
Environments: Production, Preview, Development
```

#### Variable 3: `VITE_SUPABASE_SECRET_KEY`
```
Name: VITE_SUPABASE_SECRET_KEY
Value: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
Environments: Production, Preview, Development
```

#### Variable 4: `SUPABASE_PROJECT_ID`
```
Name: SUPABASE_PROJECT_ID
Value: tnvkyuqobuzrgsumuxtc
Environments: Production, Preview, Development
```

### 4. Deploy with New Variables

After adding all variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger automatic deployment

## 🔒 Security Notes

### Public vs Private Variables

- **`VITE_` prefix**: These are exposed to the browser (client-side)
- **No prefix**: These are server-side only

### Safe to Expose (Client-side)
```
VITE_SUPABASE_URL=https://tnvkyuqobuzrgsumuxtc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
```

### Keep Private (Server-side only)
```
VITE_SUPABASE_SECRET_KEY=sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69
SUPABASE_PROJECT_ID=tnvkyuqobuzrgsumuxtc
```

## 🧪 Testing Environment Variables

### Local Testing

```bash
# Check if variables are loaded
npm run dev
# Open browser console and check:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### GitHub Actions Testing

The pipeline will automatically use the secrets you configured.

### Vercel Testing

After deployment, check the Vercel function logs to ensure variables are loaded correctly.

## 📋 Environment Variables Checklist

### ✅ Local Development
- [ ] `.env.local` file created
- [ ] All Supabase variables added
- [ ] Development server starts without errors

### ✅ GitHub Actions
- [ ] `VITE_SUPABASE_URL` secret added
- [ ] `VITE_SUPABASE_ANON_KEY` secret added
- [ ] `VITE_SUPABASE_SECRET_KEY` secret added
- [ ] `SUPABASE_PROJECT_ID` secret added
- [ ] Pipeline runs successfully

### ✅ Vercel
- [ ] All environment variables added
- [ ] Variables set for all environments (Production, Preview, Development)
- [ ] Deployment successful
- [ ] Application works in production

## 🚨 Troubleshooting

### Common Issues

1. **Variables not loading in production**
   - Ensure variables are added to Vercel
   - Redeploy after adding variables
   - Check variable names match exactly

2. **GitHub Actions failing**
   - Verify all secrets are added correctly
   - Check secret names match the workflow
   - Ensure no extra spaces in values

3. **Local development issues**
   - Restart development server after adding variables
   - Check `.env.local` file exists and has correct values
   - Verify file is in project root

### Quick Fixes

```bash
# Restart development server
npm run dev

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# Check environment variables
echo $VITE_SUPABASE_URL
```

## 🔄 Deployment Webhook

Your Vercel deployment webhook:
```
https://api.vercel.com/v1/integrations/deploy/prj_bbkgO4Z6sv63LWVFNCQMRt2TUAZN/0FkGTslvWG
```

This webhook is automatically triggered by the GitHub Actions pipeline when tests pass.

---

## 📞 Need Help?

1. **Check the logs** in GitHub Actions or Vercel
2. **Verify all variables** are set correctly
3. **Test locally** before deploying
4. **Check Supabase dashboard** for any issues

Your ChatSphere application is now properly configured with all necessary environment variables! 🎉
