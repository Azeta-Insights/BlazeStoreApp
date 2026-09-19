# BlazeStore Vercel Deployment Guide

This application is fully optimized for **Vercel** with a unified full-stack architecture:
- **Frontend**: Vite + React 19 single-page application built into `/dist`
- **Backend**: Express REST API executed as a Vercel Serverless Function via `/api/index.ts`
- **Routing & Rewrites**: Configured via `vercel.json` with static asset caching and SPA fallbacks

---

## 🚀 Quick Deploy to Vercel

### Step 1: Push or Import Repository to Vercel
1. Open [vercel.com](https://vercel.com) and click **"Add New..." > "Project"**.
2. Select your repository.
3. Vercel will automatically detect the **Vite** framework from `vercel.json`.

### Step 2: Configure Environment Variables in Vercel
In the Vercel project configuration dashboard (Settings > Environment Variables), configure the following:

| Variable | Description | Example / Required |
| :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | Paystack Live/Test Secret Key for Real-Time Checkout | `sk_live_...` or `sk_test_...` (**Critical for Payments**) |
| `PAYSTACK_PUBLIC_KEY` | Paystack Public Key | `pk_live_...` or `pk_test_...` (**Critical for Payments**) |
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:password@cluster.mongodb.net/blazestore?retryWrites=true&w=majority` (Required) |
| `MONGODB_DB_NAME` | Database Name | `blazestore` (Optional, defaults to `blazestore`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary CDN Cloud Name | `your_cloud_name` (Optional for CDN image hosting) |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` (Optional) |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` (Optional) |
| `GEMINI_API_KEY` | Google Gemini API Key | `your_gemini_api_key` (Optional) |

---

### Paystack Webhook Configuration (Optional for Instant Async Callbacks)
- In your **[Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)** under **API Keys & Webhooks**:
- Set the **Live Webhook URL** to: `https://your-vercel-domain.vercel.app/api/paystack/webhook`
- Set the **Test Webhook URL** to: `https://your-vercel-domain.vercel.app/api/paystack/webhook`


---

## 🛠️ Build & Architecture Summary

- **Build Command**: `npm run build` (`vite build`)
- **Output Directory**: `dist`
- **Serverless API Routes**: `/api/*` mapped to `/api/index.ts`
- **Static Assets**: Cached for maximum performance (`Cache-Control: public, max-age=31536000, immutable`)

---

## 👑 Owner & Admin Capabilities
- **Store Owner Super Admin**: Full unrestricted access to Financials, Sales & Revenue exports, Product catalog CRUD, Inventory stock adjustments, unrestricted instant refunds, staff permission delegation, and direct MongoDB database explorer.
- **Role Switcher**: Seamlessly toggle between **Owner View**, **Manager View**, and **Storefront View**.
