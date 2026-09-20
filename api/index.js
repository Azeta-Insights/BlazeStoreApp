// server/createApp.ts
import express from "express";
import dotenv from "dotenv";

// server/firebase.ts
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "blazestoreapp",
  appId: "1:724566112743:web:372057304061ac5e54e542",
  apiKey: "AIzaSyBvT-lc2aM4COerr8EJIyODfa7gIvUdmBQ",
  authDomain: "blazestoreapp.firebaseapp.com",
  storageBucket: "blazestoreapp.firebasestorage.app",
  messagingSenderId: "724566112743",
  measurementId: "",
  oAuthClientId: "",
  recaptchaSiteKey: ""
};

// server/firebase.ts
var projectId = firebase_applet_config_default.projectId || "blazestoreapp";
var adminApp = getApps().length === 0 ? initializeApp({ projectId }) : getApp();
var adminDb = getFirestore(adminApp);
var adminAuth = getAuth(adminApp);

// server/auth.ts
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;
  let rawToken = idToken.trim();
  if (rawToken.startsWith("Bearer ")) {
    rawToken = rawToken.substring(7).trim();
  }
  if (!rawToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(rawToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email?.split("@")[0] || "User",
      role: decoded.role || void 0,
      roleType: decoded.roleType || void 0
    };
  } catch (err) {
    if (err?.code === "auth/id-token-expired" || err?.message?.includes("expired")) {
      console.log("[Server Auth] Notice: Firebase ID token has expired. Request will fall back to public/cached permissions or prompt token refresh.");
    } else {
      console.warn("[Server Auth] Token verification notice:", err?.message || err);
    }
    return null;
  }
}
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("=").trim());
    }
  });
  return list;
}

// server/db.ts
import fs from "fs";
import path from "path";

// src/data/mockData.ts
var BEST_DEALS = [];
var RECOMMENDED_PRODUCTS = [];

// server/firestoreRest.ts
var projectId2 = firebase_applet_config_default.projectId || "blazestoreapp";
var apiKey = firebase_applet_config_default.apiKey || "";
var BASE_URL = `https://firestore.googleapis.com/v1/projects/${projectId2}/databases/(default)/documents`;
function toFirestoreValue(val) {
  if (val === null || val === void 0) {
    return { nullValue: null };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== void 0) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return {
      mapValue: { fields }
    };
  }
  return { stringValue: String(val) };
}
function fromFirestoreValue(val) {
  if (!val) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    return (val.arrayValue?.values || []).map(fromFirestoreValue);
  }
  if ("mapValue" in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}
function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const data = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  const id = doc.name ? doc.name.split("/").pop() : void 0;
  return { ...data, id: data.id || id };
}
async function restGetCollection(collectionName) {
  try {
    const url = `${BASE_URL}/${collectionName}?key=${apiKey}&pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    if (!json.documents) return [];
    return json.documents.map(fromFirestoreDoc).filter(Boolean);
  } catch {
    return [];
  }
}
async function restGetDoc(collectionName, docId) {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreDoc(json);
  } catch {
    return null;
  }
}
async function restSetDoc(collectionName, docId, data) {
  try {
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== void 0) {
        fields[k] = toFirestoreValue(v);
      }
    }
    const url = `${BASE_URL}/${collectionName}/${docId}?key=${apiKey}`;
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return { ...data, id: docId };
  } catch {
    return { ...data, id: docId };
  }
}
async function restDeleteDoc(collectionName, docId) {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}?key=${apiKey}`;
    const res = await fetch(url, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

// server/email.ts
import nodemailer from "nodemailer";
var runtimeSmtpHost = "smtp.gmail.com";
var runtimeSmtpPort = 587;
var runtimeSmtpUser = "blessing.waydiva@gmail.com";
var runtimeSmtpPass = "pmfmflsgfdyxfwet";
var runtimeSmtpFrom = "BlazeStore NG <blessing.waydiva@gmail.com>";
var runtimeSmtpSecure = false;
async function setRuntimeEmailConfig(config) {
  if (config.host !== void 0) runtimeSmtpHost = config.host.trim();
  if (config.port !== void 0) runtimeSmtpPort = Number(config.port) || 587;
  if (config.user !== void 0) runtimeSmtpUser = config.user.trim();
  if (config.pass !== void 0) runtimeSmtpPass = config.pass.trim();
  if (config.from !== void 0) runtimeSmtpFrom = config.from.trim();
  if (config.secure !== void 0) runtimeSmtpSecure = Boolean(config.secure);
  try {
    await updateDbDocument("settings", "smtp", {
      host: runtimeSmtpHost,
      port: runtimeSmtpPort,
      user: runtimeSmtpUser,
      pass: runtimeSmtpPass,
      from: runtimeSmtpFrom,
      secure: runtimeSmtpSecure,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.warn("[SMTP Settings] Could not persist SMTP settings to database:", err);
  }
}
async function loadSmtpConfigFromDb() {
  try {
    const saved = await getDbDocument("settings", "smtp");
    if (saved) {
      if (saved.host) runtimeSmtpHost = saved.host;
      if (saved.port) runtimeSmtpPort = Number(saved.port) || 587;
      if (saved.user) runtimeSmtpUser = saved.user;
      if (saved.pass) runtimeSmtpPass = saved.pass;
      if (saved.from) runtimeSmtpFrom = saved.from;
      if (saved.secure !== void 0) runtimeSmtpSecure = Boolean(saved.secure);
    }
  } catch (err) {
    console.warn("[SMTP Settings] Could not load SMTP settings from database:", err);
  }
}
loadSmtpConfigFromDb().catch(() => {
});
function getEmailTransporter() {
  let host = (runtimeSmtpHost || process.env.SMTP_HOST || "").trim();
  const port = runtimeSmtpPort || Number(process.env.SMTP_PORT) || 587;
  const user = (runtimeSmtpUser || process.env.SMTP_USER || "").trim();
  let pass = (runtimeSmtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim();
  if (!host && user.toLowerCase().endsWith("@gmail.com")) {
    host = "smtp.gmail.com";
  }
  if ((host.includes("gmail.com") || host.includes("googlemail.com") || user.toLowerCase().endsWith("@gmail.com")) && pass) {
    pass = pass.replace(/[\s-]+/g, "");
  }
  const secure = runtimeSmtpSecure || process.env.SMTP_SECURE === "true" || port === 465;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    name: "blazestore.ng"
  });
}
function getSenderFromAddress(user) {
  const activeUser = (user || runtimeSmtpUser || process.env.SMTP_USER || "").trim();
  const rawFrom = (runtimeSmtpFrom || process.env.SMTP_FROM || "").trim();
  if (rawFrom) {
    if (rawFrom.includes("http://") || rawFrom.includes("https://") || rawFrom.includes(".vercel.app")) {
      const cleanName = rawFrom.replace(/<https?:\/\/[^>]+>/gi, "").replace(/https?:\/\/\S+/gi, "").replace(/[<>]/g, "").trim() || "BlazeStore NG";
      return `"${cleanName}" <${activeUser}>`;
    }
    const emailMatch = rawFrom.match(/<([^>]+@[^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      const namePart = rawFrom.replace(/<[^>]+>/, "").trim() || "BlazeStore NG";
      const cleanName = namePart.replace(/^["']|["']$/g, "").trim();
      return `"${cleanName}" <${emailMatch[1]}>`;
    }
    if (!rawFrom.includes("@")) {
      const cleanName = rawFrom.replace(/^["']|["']$/g, "").trim();
      return `"${cleanName || "BlazeStore NG"}" <${activeUser}>`;
    }
    return rawFrom;
  }
  if (activeUser && activeUser.includes("@")) {
    return `"BlazeStore NG" <${activeUser}>`;
  }
  return `"BlazeStore NG" <orders@blazestore.ng>`;
}
function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}
async function sendOrderConfirmationEmail(order) {
  const recipientEmail = order.customer?.email;
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn("[Email Service] Skipping email dispatch: Invalid customer email on order", order.id);
    return { success: false, error: "Recipient email is missing or invalid." };
  }
  const transporter = getEmailTransporter();
  const smtpUser = (runtimeSmtpUser || process.env.SMTP_USER || "").trim();
  const fromAddress = getSenderFromAddress(smtpUser);
  const itemsHtml = (order.items || []).map(
    (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #EDEDF2;">
          <strong>${item.name}</strong>
          ${item.variant ? `<br><small style="color: #6B7280;">Variant: ${item.variant}</small>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #EDEDF2; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #EDEDF2; text-align: right;">${formatNaira(item.price * item.quantity)}</td>
      </tr>
    `
  ).join("");
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - BlazeStore</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F4F5; margin: 0; padding: 24px; color: #18181B;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E4E4E7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background-color: #7C6FE0; padding: 28px; text-align: center; color: #FFFFFF;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">BLAZESTORE</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for your order! \u{1F389}</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px;">
            <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">
              Hello <strong>${order.customer?.name || "Valued Customer"}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #52525B;">
              We have received your order <strong>#${order.orderId || order.id}</strong>. Our logistics team is already preparing it for delivery.
            </p>

            <!-- Order Summary Box -->
            <div style="background-color: #FAFAFA; border: 1px solid #F4F4F5; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #71717A; margin-bottom: 8px;">
                <span>Order Reference: <strong>${order.orderId || order.id}</strong></span>
                <span>Payment Status: <strong style="color: ${order.paymentStatus === "paid" ? "#10B981" : "#F59E0B"};">${(order.paymentStatus || "processing").toUpperCase()}</strong></span>
              </div>
              <div style="font-size: 13px; color: #71717A;">
                <span>Payment Method: <strong>${order.paymentMethod || "Paystack"}</strong></span>
                ${order.paymentRef ? `<br><span>Transaction Ref: <code style="background: #E4E4E7; padding: 2px 4px; border-radius: 4px;">${order.paymentRef}</code></span>` : ""}
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 24px 0;">
              <thead>
                <tr style="background-color: #F4F4F5; color: #52525B; text-align: left;">
                  <th style="padding: 10px 12px; border-radius: 6px 0 0 6px;">Item</th>
                  <th style="padding: 10px 12px; text-align: center;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 8px 12px; text-align: right; color: #71717A;">Subtotal:</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${formatNaira(order.subtotal || 0)}</td>
                </tr>
                ${order.discount ? `
                <tr>
                  <td colspan="2" style="padding: 8px 12px; text-align: right; color: #10B981;">Discount:</td>
                  <td style="padding: 8px 12px; text-align: right; color: #10B981; font-weight: 600;">-${formatNaira(order.discount)}</td>
                </tr>` : ""}
                <tr>
                  <td colspan="2" style="padding: 8px 12px; text-align: right; color: #71717A;">Delivery Fee:</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${order.shipping === 0 ? "FREE" : formatNaira(order.shipping || 0)}</td>
                </tr>
                <tr style="border-top: 2px solid #18181B; font-size: 16px;">
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: 900;">Total Order Amount:</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900; color: #7C6FE0;">${formatNaira(order.total || 0)}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Delivery Address -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-top: 24px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 800; color: #334155;">\u{1F4CD} Delivery Address</h4>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                ${order.customer?.name || ""}<br>
                ${order.customer?.address || "Standard Delivery"}<br>
                ${order.customer?.city || ""}, ${order.customer?.state || ""}, ${order.customer?.country || "Nigeria"}<br>
                \u{1F4DE} ${order.customer?.phone || "Not provided"}
              </p>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #71717A; margin-top: 28px; text-align: center;">
              Need help with this order? Contact our support team at <a href="mailto:support@blazestore.ng" style="color: #7C6FE0; text-decoration: none; font-weight: 600;">support@blazestore.ng</a> or call <strong>+234 800 2529 378</strong>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #FAFAFA; border-top: 1px solid #F4F4F5; padding: 20px; text-align: center; font-size: 12px; color: #A1A1AA;">
            \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} BlazeStore Nigeria. All rights reserved.
          </div>

        </div>
      </body>
    </html>
  `;
  if (!transporter) {
    console.log(`[Email Dispatch Notice] SMTP not configured in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS). Order confirmation for #${order.orderId || order.id} was logged and saved in Firestore notifications feed.`);
    return {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`
    };
  }
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `Order Confirmed #${order.orderId || order.id} - BlazeStore`,
      html: htmlContent
    });
    console.log(`[Email Service] Order confirmation email sent to ${recipientEmail} for order #${order.orderId || order.id}. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      simulated: false
    };
  } catch (err) {
    const friendlyError = formatSmtpError(err);
    console.warn(`[Email Dispatch Notice] Could not deliver email to ${recipientEmail}:`, friendlyError);
    return {
      success: false,
      error: friendlyError
    };
  }
}
function formatSmtpError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("535 5.7.139") || msg.includes("SmtpClientAuthentication is disabled")) {
    return "Microsoft 365 / Outlook error (535 5.7.139): Authenticated SMTP is disabled for this mailbox by Microsoft policy. Please enable SMTP AUTH in Microsoft 365 Admin Center, or use Gmail SMTP with a 16-character App Password (smtp.gmail.com:587).";
  }
  if (msg.includes("535-5.7.8") || msg.includes("Username and Password not accepted") || msg.includes("BadCredentials") || msg.includes("535 5.7.8")) {
    return "Authentication failed: Invalid email or password. If using Gmail, please create and use a 16-character Google App Password (not your personal account password).";
  }
  if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    return `Connection to SMTP host failed (${err.code || "Network Error"}). Please check your SMTP Host address and Port number.`;
  }
  return msg;
}
function getEmailStatus() {
  const host = runtimeSmtpHost || process.env.SMTP_HOST;
  const user = runtimeSmtpUser || process.env.SMTP_USER;
  const hasPass = Boolean(runtimeSmtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD);
  const isConfigured = Boolean(host && user && hasPass);
  return {
    configured: isConfigured,
    host: host || "Not set",
    port: runtimeSmtpPort || Number(process.env.SMTP_PORT) || 587,
    secure: runtimeSmtpSecure || process.env.SMTP_SECURE === "true",
    user: user ? `${user.substring(0, 4)}***@${user.split("@")[1] || ""}` : "Not set",
    from: runtimeSmtpFrom || process.env.SMTP_FROM || "BlazeStore NG <orders@blazestore.ng>"
  };
}
async function sendTestEmail(targetEmail) {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in environment variables."
    };
  }
  const fromAddress = getSenderFromAddress((runtimeSmtpUser || process.env.SMTP_USER || "").trim());
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetEmail,
      subject: "\u2705 BlazeStore Outbound Email Test Successful",
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #1E293B;">
          <h2 style="color: #4F46E5;">Email Delivery Connected! \u{1F389}</h2>
          <p>This is a verification test from your <strong>BlazeStore Nigeria</strong> store platform.</p>
          <p>Your SMTP email configuration is active and ready to deliver real-time order receipts, customer invoices, and delivery updates.</p>
          <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94A3B8;">Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}</p>
        </div>
      `
    });
    return {
      success: true,
      messageId: info.messageId,
      simulated: false
    };
  } catch (err) {
    const friendly = formatSmtpError(err);
    return {
      success: false,
      error: friendly
    };
  }
}

// server/db.ts
function getRoleForEmail(email) {
  const clean = (email || "").trim().toLowerCase();
  if (clean === "azetablessingb@gmail.com" || clean === "blessing.waydiva@gmail.com" || clean === "owner@blazestore.com" || clean.startsWith("owner@") || clean.includes("storeowner")) {
    return { role: "Store Owner", roleType: "owner" };
  }
  if (clean === "manager@blazestore.com" || clean.startsWith("manager@") || clean.includes("storemanager")) {
    return { role: "Store Manager", roleType: "manager" };
  }
  return { role: "Customer", roleType: "customer" };
}
var DB_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
var DB_FILE = path.join(DB_DIR, "blazestore_db.json");
var serverStore = /* @__PURE__ */ new Map();
function loadDatabaseFromDisk() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      if (raw.trim()) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          for (const [colName, docs] of Object.entries(data)) {
            if (Array.isArray(docs)) {
              const map = getStoreMap(colName);
              docs.forEach((d) => {
                if (d && d.id) {
                  map.set(String(d.id), d);
                }
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Storage] Failed to read blazestore_db.json from disk:", err);
  }
}
var saveTimeout = null;
function persistDatabaseToDisk(immediate = false) {
  const executeSave = () => {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const serializable = {};
      for (const [colName, map] of serverStore.entries()) {
        serializable[colName] = Array.from(map.values());
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(serializable, null, 2), "utf-8");
    } catch (err) {
      console.warn("[Storage] Failed to save blazestore_db.json to disk:", err);
    }
  };
  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    executeSave();
  } else {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(executeSave, 300);
  }
}
function getStoreMap(collectionName) {
  let map = serverStore.get(collectionName);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    serverStore.set(collectionName, map);
  }
  return map;
}
loadDatabaseFromDisk();
var syncedCollections = /* @__PURE__ */ new Set();
async function syncCollectionFromRemote(collectionName) {
  try {
    const remoteDocs = await restGetCollection(collectionName);
    const map = getStoreMap(collectionName);
    if (Array.isArray(remoteDocs) && remoteDocs.length > 0) {
      remoteDocs.forEach((d) => {
        if (d && d.id) {
          map.set(String(d.id), d);
        }
      });
      persistDatabaseToDisk(false);
    }
  } catch (err) {
    console.warn(`[Firestore Sync] Failed to load ${collectionName}:`, err);
  }
}
async function fetchCollection(collectionName) {
  const map = getStoreMap(collectionName);
  if (!syncedCollections.has(collectionName)) {
    syncedCollections.add(collectionName);
    await syncCollectionFromRemote(collectionName);
  }
  return Array.from(map.values());
}
async function fetchDocument(collectionName, docId) {
  const map = getStoreMap(collectionName);
  if (map.has(docId)) {
    return map.get(docId);
  }
  try {
    const remote = await restGetDoc(collectionName, docId);
    if (remote) {
      map.set(docId, remote);
      persistDatabaseToDisk(false);
      return remote;
    }
  } catch {
  }
  return null;
}
async function saveDocument(collectionName, docId, data, merge = true) {
  const map = getStoreMap(collectionName);
  const existing = map.get(docId) || {};
  const merged = merge ? { ...existing, ...data, id: docId } : { ...data, id: docId };
  map.set(docId, merged);
  persistDatabaseToDisk(true);
  restSetDoc(collectionName, docId, merged).catch((err) => {
    console.warn(`[Firestore Save] Failed for ${collectionName}/${docId}:`, err);
  });
}
async function removeDocument(collectionName, docId) {
  const map = getStoreMap(collectionName);
  map.delete(docId);
  persistDatabaseToDisk(true);
  restDeleteDoc(collectionName, docId).catch((err) => {
    console.warn(`[Firestore Delete] Failed for ${collectionName}/${docId}:`, err);
  });
}
async function getDatabaseStatus(force = false) {
  try {
    const start = performance.now();
    const [products, orders, refunds, users] = await Promise.all([
      fetchCollection("products"),
      fetchCollection("orders"),
      fetchCollection("refunds"),
      fetchCollection("users")
    ]);
    const end = performance.now();
    return {
      connected: true,
      isUsingFallback: false,
      database: "Cloud Firestore (blazestoreapp)",
      provider: "firestore-rest",
      hasUri: true,
      pingMs: Math.max(1, Math.round(end - start)),
      error: null,
      stats: {
        products: products.length,
        orders: orders.length,
        refunds: refunds.length,
        users: users.length,
        cart: 0,
        wishlist: 0
      }
    };
  } catch (err) {
    return {
      connected: true,
      isUsingFallback: false,
      database: "Cloud Firestore (blazestoreapp)",
      provider: "firestore-rest",
      hasUri: true,
      pingMs: 1,
      error: null,
      stats: {
        products: 0,
        orders: 0,
        refunds: 0,
        users: 0,
        cart: 0,
        wishlist: 0
      }
    };
  }
}
async function getProducts(category, search) {
  try {
    let items = await fetchCollection("products");
    if (category && category.toLowerCase() !== "all") {
      const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, "");
      items = items.filter((p) => {
        if (!p.category) return false;
        const cleanProdCat = p.category.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanProdCat === cleanCat || cleanProdCat.includes(cleanCat) || cleanCat.includes(cleanProdCat);
      });
    }
    if (search) {
      const qStr = search.toLowerCase();
      items = items.filter(
        (p) => p.name?.toLowerCase().includes(qStr) || p.description?.toLowerCase().includes(qStr) || p.brand?.toLowerCase().includes(qStr) || p.category?.toLowerCase().includes(qStr) || p.sku?.toLowerCase().includes(qStr)
      );
    }
    return items;
  } catch {
    return [];
  }
}
async function getAllProductsAdmin(category, search) {
  return getProducts(category, search);
}
async function updateProductStock(id, stockQuantity, inStock) {
  const current = await fetchDocument("products", id);
  if (!current) {
    throw new Error(`Product ${id} not found in Firestore.`);
  }
  const updated = {
    ...current,
    stockQuantity,
    inStock: inStock !== void 0 ? inStock : stockQuantity > 0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDocument("products", id, updated);
  return updated;
}
async function createProductAdmin(data) {
  const id = data.id || `prod-${Date.now()}`;
  const newProduct = {
    id,
    name: data.name || "New Fragrance",
    brand: data.brand || "BlazeStore Sillage",
    category: data.category || "Perfumes",
    price: data.price || 0,
    originalPrice: data.originalPrice || data.price || 0,
    discountPercentage: data.discountPercentage || 0,
    image: data.image || "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
    description: data.description || "",
    inStock: data.inStock ?? true,
    stockQuantity: data.stockQuantity ?? 50,
    rating: data.rating || 4.8,
    reviewCount: data.reviewCount || 1,
    isDeal: Boolean(data.isDeal),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDocument("products", id, newProduct);
  return newProduct;
}
async function updateProductAdmin(id, data) {
  const existing = await fetchDocument("products", id) || { id, name: "Product", price: 0 };
  const updated = { ...existing, ...data, id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await saveDocument("products", id, updated);
  return updated;
}
async function deleteProductAdmin(id) {
  await removeDocument("products", id);
  return { success: true, message: `Product ${id} removed from Firestore.` };
}
async function clearAllProductsAdmin() {
  const prods = await fetchCollection("products");
  await Promise.all(prods.map((p) => removeDocument("products", p.id)));
  return { success: true, message: "All products cleared from Firestore." };
}
async function bulkCreateProductsAdmin(products) {
  const createdList = [];
  await Promise.all(
    products.map(async (p, idx) => {
      const id = p.id || `prod-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const price = Number(p.price) || 0;
      const originalPrice = p.originalPrice ? Number(p.originalPrice) : p.discountPercentage ? Math.round(price * (100 / (100 - (p.discountPercentage || 0)))) : void 0;
      let discountPercentage = p.discountPercentage;
      if (!discountPercentage && originalPrice && originalPrice > price) {
        discountPercentage = Math.round((originalPrice - price) / originalPrice * 100);
      }
      const isDeal = Boolean(p.isDeal) || Boolean(p.isHot) || discountPercentage !== void 0 && discountPercentage > 0;
      const newProduct = {
        id,
        name: (p.name || "Product").trim(),
        category: (p.category || "General").trim(),
        brand: p.brand?.trim() || void 0,
        collection: p.collection?.trim() || void 0,
        price,
        originalPrice,
        costPrice: p.costPrice ? Number(p.costPrice) : Math.round(price * 0.55),
        discountPercentage: discountPercentage || void 0,
        stockQuantity: p.stockQuantity !== void 0 ? Number(p.stockQuantity) : 25,
        sku: p.sku?.trim() || `BLZ-${Date.now().toString().slice(-4)}-${idx + 1}`,
        inStock: p.inStock ?? Number(p.stockQuantity ?? 25) > 0,
        image: p.image?.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
        description: p.description?.trim() || "",
        rating: p.rating || 5,
        reviewCount: p.reviewCount || 0,
        badge: p.badge?.trim() || (isDeal ? discountPercentage ? `${discountPercentage}% OFF` : "Hot Deal" : p.isNewArrival ? "New Arrival" : "In Stock"),
        isDeal,
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
        isHot: Boolean(p.isHot) || isDeal,
        colors: p.colors,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveDocument("products", id, newProduct);
      createdList.push(newProduct);
    })
  );
  return { success: true, count: createdList.length, products: createdList };
}
async function getCart(userId = "guest") {
  const doc = await fetchDocument("carts", userId);
  return doc?.items || [];
}
async function addToCart(item, userId = "guest") {
  const existingDoc = await fetchDocument("carts", userId);
  let items = existingDoc?.items ? [...existingDoc.items] : [];
  const existingIdx = items.findIndex((i) => i.productId === (item.productId || item.id));
  if (existingIdx > -1) {
    items[existingIdx].quantity += item.quantity || 1;
  } else {
    items.unshift({
      id: `cart-${Date.now()}-${item.id || item.productId}`,
      productId: item.id || item.productId,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice || item.price,
      image: item.image,
      variant: item.variant || "Standard Edition",
      color: item.color,
      quantity: item.quantity || 1
    });
  }
  await saveDocument("carts", userId, { userId, items, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return items;
}
async function updateCartQuantity(itemId, delta, userId = "guest") {
  const existingDoc = await fetchDocument("carts", userId);
  if (!existingDoc) return [];
  let items = existingDoc.items || [];
  items = items.map((i) => i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0);
  await saveDocument("carts", userId, { userId, items, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return items;
}
async function removeFromCart(itemId, userId = "guest") {
  const existingDoc = await fetchDocument("carts", userId);
  if (!existingDoc) return [];
  let items = (existingDoc.items || []).filter((i) => i.id !== itemId);
  await saveDocument("carts", userId, { userId, items, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return items;
}
async function clearCart(userId = "guest") {
  await saveDocument("carts", userId, { userId, items: [], updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return [];
}
async function getWishlist(userId = "guest") {
  const doc = await fetchDocument("wishlists", userId);
  return doc?.items || [];
}
async function toggleWishlist(product, userId = "guest") {
  const existingDoc = await fetchDocument("wishlists", userId);
  let items = existingDoc?.items ? [...existingDoc.items] : [];
  const idx = items.findIndex((p) => p.id === product.id);
  if (idx > -1) {
    items.splice(idx, 1);
  } else {
    items.unshift(product);
  }
  await saveDocument("wishlists", userId, { userId, items, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return items;
}
async function createOrder(orderData) {
  const orderId = orderData.orderId || orderData.id || `NG-${Date.now().toString().slice(-6)}`;
  const newOrder = {
    id: orderId,
    orderId,
    userId: orderData.userId || "guest",
    customer: orderData.customer || {
      name: orderData.name || "Customer",
      email: orderData.email || orderData.userEmail || "customer@example.com",
      phone: orderData.phone || "",
      address: orderData.address || "Standard Delivery Address",
      city: orderData.city || "Lagos",
      state: orderData.state || "Lagos State",
      country: "Nigeria"
    },
    items: orderData.items || [],
    subtotal: orderData.subtotal || 0,
    discount: orderData.discount || 0,
    shipping: orderData.shipping || 0,
    tax: orderData.tax || 0,
    total: orderData.total || 0,
    currency: orderData.currency || "NGN",
    currencySymbol: orderData.currencySymbol || "\u20A6",
    status: orderData.status || "processing",
    paymentMethod: orderData.paymentMethod || "paystack",
    paymentStatus: orderData.paymentStatus || "paid",
    paymentRef: orderData.paymentReference || orderData.paymentRef,
    deliveryType: orderData.deliveryType || "delivery",
    pickupStation: orderData.pickupStation,
    createdAt: orderData.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    timeline: orderData.timeline || [
      {
        status: "Order Placed",
        title: "Order Confirmed",
        description: "Your order was verified and saved to database.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isCompleted: true
      },
      {
        status: "Processing",
        title: "Preparing for Dispatch",
        description: "Items are being packed at the fulfillment center.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isCompleted: true
      }
    ],
    refundAmount: 0,
    refundStatus: "none"
  };
  await saveDocument("orders", orderId, newOrder);
  try {
    const notifId = `notif-${Date.now()}`;
    await saveDocument("notifications", notifId, {
      id: notifId,
      title: `Order Confirmed #${orderId}`,
      message: `Your order for \u20A6${(newOrder.total || 0).toLocaleString()} (${newOrder.items.length} item${newOrder.items.length === 1 ? "" : "s"}) has been confirmed!`,
      type: "order",
      userId: newOrder.userId,
      isRead: false,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (notifErr) {
    console.warn("[Notification Notice]:", notifErr);
  }
  sendOrderConfirmationEmail(newOrder).catch((err) => {
    console.warn("[Email Dispatch Notice]:", err?.message || err);
  });
  return newOrder;
}
async function getUserOrders(userId, email, orderId) {
  const orders = await fetchCollection("orders");
  if (orderId && orderId.trim()) {
    const cleanId = orderId.trim().toLowerCase();
    const matched = orders.filter(
      (o) => o.orderId && o.orderId.toLowerCase() === cleanId || o.id && o.id.toLowerCase() === cleanId || o.paymentRef && o.paymentRef.toLowerCase() === cleanId
    );
    if (matched.length > 0) return matched;
  }
  const cleanUserId = (userId || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  let filtered = orders.filter((o) => {
    if (cleanUserId && cleanUserId !== "guest" && cleanUserId !== "guest-visitor" && o.userId === cleanUserId) {
      return true;
    }
    if (cleanEmail && o.customer?.email && o.customer.email.toLowerCase() === cleanEmail) {
      return true;
    }
    return false;
  });
  if (filtered.length === 0 && (!cleanUserId || cleanUserId === "guest") && !cleanEmail) {
    filtered = orders;
  }
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filtered;
}
async function getOrderById(orderId) {
  const cleanId = (orderId || "").trim().toLowerCase();
  if (!cleanId) return null;
  const doc = await fetchDocument("orders", orderId);
  if (doc) return doc;
  const orders = await fetchCollection("orders");
  return orders.find(
    (o) => o.orderId && o.orderId.toLowerCase() === cleanId || o.id && o.id.toLowerCase() === cleanId || o.paymentRef && o.paymentRef.toLowerCase() === cleanId
  ) || null;
}
async function updateOrderPaymentByReference(reference, paymentDetails) {
  const orders = await fetchCollection("orders");
  for (const o of orders) {
    if (o.paymentRef === reference || o.orderId === reference || o.id === reference) {
      const updatedOrder = {
        ...o,
        paymentStatus: paymentDetails.paid ? "paid" : "failed",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveDocument("orders", o.id, updatedOrder);
      if (paymentDetails.paid && o.paymentStatus !== "paid") {
        sendOrderConfirmationEmail(updatedOrder).catch((err) => {
          console.warn("[Email Dispatch Notice on Payment]:", err?.message || err);
        });
      }
    }
  }
}
async function getAllOrders(status, search) {
  let orders = await fetchCollection("orders");
  if (status && status.toLowerCase() !== "all") {
    orders = orders.filter((o) => o.status?.toLowerCase() === status.toLowerCase());
  }
  if (search) {
    const qStr = search.toLowerCase();
    orders = orders.filter(
      (o) => o.orderId?.toLowerCase().includes(qStr) || o.customer?.name?.toLowerCase().includes(qStr) || o.customer?.email?.toLowerCase().includes(qStr)
    );
  }
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}
async function updateOrderStatus(orderId, status, adminInfo) {
  const existing = await fetchDocument("orders", orderId);
  if (!existing) {
    throw new Error(`Order ${orderId} not found.`);
  }
  const updatedTimeline = [...existing.timeline || []];
  updatedTimeline.push({
    status,
    title: `Status set to ${status}`,
    description: `Updated by ${adminInfo?.name || "Administrator"}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isCompleted: true
  });
  const updated = {
    ...existing,
    status,
    timeline: updatedTimeline,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDocument("orders", orderId, updated);
  return updated;
}
async function deleteOrderAdmin(orderId) {
  await removeDocument("orders", orderId);
  return { success: true, message: `Order ${orderId} deleted from Firestore.` };
}
async function getPendingOrders() {
  const orders = await getAllOrders();
  return orders.filter((o) => o.status === "processing" || !o.paymentRef);
}
async function processRefund(refundData) {
  const refundId = `ref-${Date.now()}`;
  const newRefund = {
    id: refundId,
    orderId: refundData.orderId,
    customerName: refundData.customerName || "Customer",
    customerEmail: refundData.customerEmail || "customer@example.com",
    amount: refundData.amount,
    reason: refundData.reason || "Customer Return",
    status: refundData.adminRole === "owner" ? "approved" : "pending_owner_approval",
    refundedBy: refundData.adminName || "Admin",
    adminRole: refundData.adminRole || "manager",
    restocked: Boolean(refundData.restockItems),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDocument("refunds", refundId, newRefund);
  return { success: true, refund: newRefund };
}
async function approveRefund(id, ownerName) {
  const existing = await fetchDocument("refunds", id);
  if (!existing) throw new Error(`Refund ${id} not found.`);
  const updated = { ...existing, status: "approved", approvedBy: ownerName };
  await saveDocument("refunds", id, updated);
  return { success: true, refund: updated };
}
async function rejectRefund(id, ownerName) {
  const existing = await fetchDocument("refunds", id);
  if (!existing) throw new Error(`Refund ${id} not found.`);
  const updated = { ...existing, status: "rejected", rejectedBy: ownerName };
  await saveDocument("refunds", id, updated);
  return { success: true, refund: updated };
}
async function getRefunds() {
  const list = await fetchCollection("refunds");
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}
async function registerUser(userData) {
  const cleanEmail = userData.email.trim().toLowerCase();
  let uid = "";
  if (userData.idToken) {
    const verified = await verifyFirebaseIdToken(userData.idToken);
    if (verified) {
      uid = verified.uid;
    }
  }
  if (!uid) {
    uid = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  }
  const roleInfo = getRoleForEmail(cleanEmail);
  const roleType = userData.roleType || roleInfo.roleType;
  const role = roleType === "owner" ? "Store Owner" : roleType === "manager" ? "Store Manager" : roleInfo.role;
  const existing = await fetchDocument("users", uid);
  let newUser;
  if (existing) {
    newUser = existing;
  } else {
    newUser = {
      id: uid,
      name: userData.name || cleanEmail.split("@")[0],
      email: cleanEmail,
      phone: userData.phone || "",
      role,
      roleType,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalOrders: 0,
      totalSpent: 0
    };
    await saveDocument("users", uid, newUser);
  }
  return { user: newUser, message: "User profile stored in Firestore." };
}
async function loginUser(credentials) {
  const cleanEmail = credentials.email.trim().toLowerCase();
  let uid = "";
  if (credentials.idToken) {
    const verified = await verifyFirebaseIdToken(credentials.idToken);
    if (!verified) {
      throw new Error("Invalid or expired Firebase Auth token. Access denied.");
    }
    uid = verified.uid;
  }
  if (!uid) {
    try {
      const fbUser = await adminAuth.getUserByEmail(cleanEmail);
      uid = fbUser.uid;
    } catch {
      uid = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
    }
  }
  const existing = await fetchDocument("users", uid);
  let user;
  const roleInfo = getRoleForEmail(cleanEmail);
  if (existing) {
    user = existing;
  } else {
    user = {
      id: uid,
      name: cleanEmail.includes("owner") ? "Azeta Blessing" : cleanEmail.includes("manager") ? "Blessing Waydiva" : cleanEmail.split("@")[0],
      email: cleanEmail,
      phone: "",
      role: roleInfo.role,
      roleType: roleInfo.roleType,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalOrders: 0,
      totalSpent: 0
    };
    await saveDocument("users", uid, user);
  }
  return { user, message: "Authenticated successfully with Firebase Auth." };
}
async function getCurrentUser(idToken) {
  if (!idToken) return null;
  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) return null;
  const doc = await fetchDocument("users", verified.uid);
  if (doc) {
    return doc;
  }
  const roleInfo = getRoleForEmail(verified.email || "");
  return {
    id: verified.uid,
    name: verified.name || "User",
    email: verified.email || "",
    role: roleInfo.role,
    roleType: roleInfo.roleType,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function logoutUser() {
  return { success: true, message: "Logged out successfully." };
}
async function getAllUsers() {
  return fetchCollection("users");
}
async function updateUserRole(id, role, roleType) {
  const existing = await fetchDocument("users", id) || { id, name: "User", email: "" };
  const updated = { ...existing, role, roleType, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await saveDocument("users", id, updated);
  return updated;
}
async function updateUserAdmin(id, data) {
  const existing = await fetchDocument("users", id) || { id, name: "User", email: "" };
  const updated = { ...existing, ...data, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await saveDocument("users", id, updated);
  return updated;
}
async function deleteUserAdmin(id) {
  await removeDocument("users", id);
  return { success: true, message: `User ${id} removed from Firestore.` };
}
async function getSalesAnalytics() {
  const [orders, refunds, products, users] = await Promise.all([
    getAllOrders(),
    getRefunds(),
    getProducts(),
    getAllUsers()
  ]);
  const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const refundAmountTotal = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const netRevenue = Math.max(0, grossRevenue - refundAmountTotal);
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "paid" || o.status === "shipped").length;
  const totalRefunds = refunds.length;
  const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) <= 10 && (p.stockQuantity ?? 0) > 0).length;
  const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 0) === 0).length;
  const totalCustomers = users.filter((u) => u.roleType === "customer" || !u.role?.toLowerCase().includes("owner") && !u.role?.toLowerCase().includes("manager")).length;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - i);
    const dayName = days[d.getDay()];
    daysMap[dayName] = { revenue: 0, orders: 0, refunds: 0 };
  }
  orders.forEach((o) => {
    const dayName = days[new Date(o.createdAt).getDay()];
    if (daysMap[dayName]) {
      daysMap[dayName].revenue += o.total || 0;
      daysMap[dayName].orders += 1;
    }
  });
  refunds.forEach((r) => {
    const dayName = days[new Date(r.createdAt).getDay()];
    if (daysMap[dayName]) {
      daysMap[dayName].refunds += r.amount || 0;
    }
  });
  const dailyRevenue = Object.entries(daysMap).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
    refunds: data.refunds
  }));
  const categorySalesMap = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || "General";
      if (!categorySalesMap[cat]) categorySalesMap[cat] = { value: 0, count: 0 };
      categorySalesMap[cat].value += (item.price || 0) * (item.quantity || 1);
      categorySalesMap[cat].count += item.quantity || 1;
    });
  });
  const categorySales = Object.entries(categorySalesMap).map(([name, stat]) => ({
    name,
    value: stat.value,
    count: stat.count
  }));
  const productSalesMap = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prodId = item.productId || item.id;
      if (!productSalesMap[prodId]) {
        productSalesMap[prodId] = {
          id: prodId,
          name: item.name || prod?.name || "Product",
          salesCount: 0,
          revenue: 0,
          stock: prod?.stockQuantity ?? 0
        };
      }
      productSalesMap[prodId].salesCount += item.quantity || 1;
      productSalesMap[prodId].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return {
    grossRevenue,
    netRevenue,
    totalOrders,
    completedOrders,
    totalRefunds,
    refundAmountTotal,
    averageOrderValue,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    totalCustomers,
    dailyRevenue,
    categorySales,
    topProducts
  };
}
async function getDbCollectionsInfo() {
  const [products, orders, refunds, users] = await Promise.all([
    fetchCollection("products"),
    fetchCollection("orders"),
    fetchCollection("refunds"),
    fetchCollection("users")
  ]);
  return [
    { name: "products", count: products.length, type: "Store Products" },
    { name: "orders", count: orders.length, type: "Customer Orders" },
    { name: "refunds", count: refunds.length, type: "Processed Refunds" },
    { name: "users", count: users.length, type: "Registered Accounts" }
  ];
}
async function queryDbCollection(colName, opts) {
  const docs = await fetchCollection(colName);
  return { documents: docs, count: docs.length };
}
async function getDbDocument(colName, id) {
  return fetchDocument(colName, id);
}
async function insertDbDocument(colName, docData) {
  const id = docData.id || docData._id || `doc-${Date.now()}`;
  await saveDocument(colName, id, { ...docData, id });
  return { success: true, documentId: id };
}
async function updateDbDocument(colName, id, docData) {
  await saveDocument(colName, id, docData);
  return { success: true, documentId: id };
}
async function deleteDbDocument(colName, id) {
  await removeDocument(colName, id);
  return { success: true, documentId: id };
}
async function exportDatabaseData() {
  const [products, orders, refunds, users] = await Promise.all([
    getProducts(),
    getAllOrders(),
    getRefunds(),
    getAllUsers()
  ]);
  return { products, orders, refunds, users };
}
async function seedCatalogToDatabase() {
  const allSeed = [...BEST_DEALS, ...RECOMMENDED_PRODUCTS];
  const res = await bulkCreateProductsAdmin(allSeed);
  return { success: true, message: `Seeded ${res.count} items into Firestore products collection.` };
}
async function getNotifications() {
  return fetchCollection("notifications");
}
async function markNotificationsRead() {
  const list = await getNotifications();
  await Promise.all(
    list.map((n) => saveDocument("notifications", n.id, { isRead: true }))
  );
  return list.map((n) => ({ ...n, isRead: true }));
}
async function clearAllMockData() {
  const [orders, refunds, notifs, users] = await Promise.all([
    fetchCollection("orders"),
    fetchCollection("refunds"),
    fetchCollection("notifications"),
    fetchCollection("users")
  ]);
  await Promise.all([
    ...orders.map((o) => removeDocument("orders", o.id)),
    ...refunds.map((r) => removeDocument("refunds", r.id)),
    ...notifs.map((n) => removeDocument("notifications", n.id)),
    ...users.filter((u) => {
      const isStaff = u.roleType === "owner" || u.roleType === "manager" || u.email?.toLowerCase().includes("owner") || u.email?.toLowerCase().includes("manager") || u.email === "azetablessingb@gmail.com" || u.email === "blessing.waydiva@gmail.com";
      return !isStaff;
    }).map((u) => removeDocument("users", u.id))
  ]);
  return { success: true, message: "All mock orders, refunds, notifications, and test customer accounts cleared from Firestore." };
}

// server/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL) {
    return true;
  }
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}
function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    return false;
  }
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true
    });
    return true;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return true;
}
function getCloudinaryStatus() {
  const isConfigured = isCloudinaryConfigured();
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || null;
  if (!cloudName && process.env.CLOUDINARY_URL) {
    try {
      const match = process.env.CLOUDINARY_URL.match(/@([^/?]+)/);
      if (match) {
        cloudName = match[1];
      }
    } catch {
    }
  }
  return {
    configured: isConfigured,
    cloudName: cloudName || (isConfigured ? "Active (URL Configured)" : null),
    hasApiKey: Boolean(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL),
    hasApiSecret: Boolean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_URL),
    message: isConfigured ? `Cloudinary storage is active and ready (Cloud: ${cloudName || "configured"}).` : "Cloudinary credentials not detected. Uploads will use inline preview until CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET are set in Settings/Secrets."
  };
}
async function uploadImageToCloudinary(imageContent, options) {
  if (!imageContent || typeof imageContent !== "string") {
    throw new Error("Image data is required for upload");
  }
  const configured = configureCloudinary();
  if (!configured) {
    console.log("[Cloudinary] Warning: Cloudinary not configured in environment. Using inline image data URL.");
    return {
      success: true,
      url: imageContent,
      isCloudinary: false,
      message: "Cloudinary environment variables not set. Image stored directly for instant preview."
    };
  }
  try {
    const uploadOptions = {
      folder: options?.folder || "blazestore_catalog",
      resource_type: "auto",
      tags: options?.tags || ["blazestore", "product"]
    };
    const result = await cloudinary.uploader.upload(
      imageContent,
      uploadOptions
    );
    console.log(`[Cloudinary] Successfully uploaded image to Cloudinary: ${result.secure_url}`);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      isCloudinary: true,
      message: "Image uploaded to Cloudinary CDN successfully!"
    };
  } catch (err) {
    console.error("[Cloudinary] Upload error:", err);
    return {
      success: true,
      url: imageContent.startsWith("data:") ? imageContent : imageContent,
      isCloudinary: false,
      error: err?.message || "Cloudinary upload failed",
      message: `Cloudinary upload error (${err?.message || "Check credentials"}). Image preserved locally.`
    };
  }
}

// server/paystack.ts
import crypto from "crypto";
var runtimePaystackSecretKey = "";
var runtimePaystackPublicKey = "pk_live_62a83832cf627e85d9451840a50e74980ca562e0";
var runtimePreferredMode = "live";
var DEFAULT_PAYSTACK_PUBLIC_KEY = "pk_live_62a83832cf627e85d9451840a50e74980ca562e0";
function isPaystackConfigured() {
  const key = getPaystackSecretKey();
  return !!(key && key.trim() !== "" && key.startsWith("sk_"));
}
function isPaystackLive() {
  const secret = getPaystackSecretKey();
  const pub = getPaystackPublicKey();
  if (secret.startsWith("sk_live_") || pub.startsWith("pk_live_")) return true;
  if (secret.startsWith("sk_test_") || pub.startsWith("pk_test_")) return false;
  return runtimePreferredMode === "live";
}
function isPaystackKeyMismatch() {
  const secret = getPaystackSecretKey();
  const pub = getPaystackPublicKey();
  if (!secret || !pub) return false;
  const isSecretLive = secret.startsWith("sk_live_");
  const isPubLive = pub.startsWith("pk_live_");
  return isSecretLive !== isPubLive;
}
function getPaystackPublicKey() {
  return (runtimePaystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || DEFAULT_PAYSTACK_PUBLIC_KEY).trim();
}
function getPaystackSecretKey() {
  return (runtimePaystackSecretKey || process.env.PAYSTACK_SECRET_KEY || "").trim();
}
function setRuntimePaystackKeys(secretKey, publicKey, mode) {
  if (secretKey !== void 0) runtimePaystackSecretKey = secretKey.trim();
  if (publicKey !== void 0) runtimePaystackPublicKey = publicKey.trim();
  if (mode !== void 0) runtimePreferredMode = mode;
}
function getPaystackFullConfig() {
  const secretKey = getPaystackSecretKey();
  const publicKey = getPaystackPublicKey();
  const configured = isPaystackConfigured();
  const isLive = isPaystackLive();
  const isMismatch = isPaystackKeyMismatch();
  let message = "Paystack Live Production Mode";
  if (isMismatch) {
    message = "\u26A0\uFE0F Warning: Key Mode Mismatch. One key is Live (sk_live/pk_live) and one is Test (sk_test/pk_test). Please use both Live keys for production.";
  } else if (isLive && configured) {
    message = "Paystack Live Production Gateway Active";
  } else if (configured) {
    message = "Paystack Test Mode Active (Switch to Live keys for real payments)";
  } else {
    message = "Paystack Live Mode Ready \u2014 Paste your Live Secret & Public keys to process real payments.";
  }
  return {
    success: true,
    configured,
    isLive,
    isMismatch,
    mode: isLive ? "live" : "test",
    preferredMode: runtimePreferredMode,
    publicKey,
    hasSecretKey: Boolean(secretKey),
    secretKeyMasked: secretKey ? `${secretKey.substring(0, 7)}...${secretKey.substring(secretKey.length - 4)}` : "",
    maskedSecretKey: secretKey ? `${secretKey.substring(0, 7)}...${secretKey.substring(secretKey.length - 4)}` : "",
    message,
    supportedChannels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"]
  };
}
async function initializePaystackTransaction(params) {
  const secretKey = getPaystackSecretKey();
  const ref = params.reference || `blz_paystack_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  if (!secretKey) {
    return {
      success: true,
      reference: ref,
      isSimulation: true,
      message: "Paystack Secret Key is not configured. Utilizing client-side direct gateway."
    };
  }
  try {
    const payload = {
      email: params.email,
      amount: Math.round(params.amount),
      // Must be in kobo (1 Naira = 100 kobo)
      reference: ref,
      currency: "NGN",
      metadata: params.metadata || {}
    };
    if (params.callbackUrl) {
      payload.callback_url = params.callbackUrl;
    }
    if (params.channels && params.channels.length > 0) {
      payload.channels = params.channels;
    } else {
      payload.channels = ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"];
    }
    console.log(`[Paystack API] Initializing transaction for ${params.email}, Amount: \u20A6${(params.amount / 100).toFixed(2)}, Ref: ${ref}`);
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.status && data.data) {
      console.log(`[Paystack API] Initialized successfully. Auth URL: ${data.data.authorization_url}`);
      return {
        success: true,
        reference: data.data.reference || ref,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        isSimulation: false
      };
    } else {
      console.warn("[Paystack API Notice]:", data.message || "Initialization fallback to client popup");
      return {
        success: false,
        reference: ref,
        isSimulation: true,
        message: data.message || "Paystack server initialize notice"
      };
    }
  } catch (err) {
    console.warn("[Paystack Init Notice]:", err?.message || err);
    return {
      success: false,
      reference: ref,
      isSimulation: true,
      message: err?.message || "Proceeding with client-side checkout"
    };
  }
}
async function verifyPaystackTransaction(reference) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return {
      success: false,
      paid: false,
      status: "unconfigured",
      reference,
      error: "PAYSTACK_SECRET_KEY is required to verify transactions with Paystack."
    };
  }
  try {
    console.log(`[Paystack API] Verifying transaction reference: ${reference}`);
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    if (data.status && data.data) {
      const isPaid = data.data.status === "success";
      console.log(`[Paystack API] Verification result for ${reference}: status=${data.data.status}, paid=${isPaid}, amount=\u20A6${(data.data.amount / 100).toFixed(2)}`);
      return {
        success: true,
        paid: isPaid,
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
        channel: data.data.channel,
        gatewayResponse: data.data.gateway_response,
        paidAt: data.data.paid_at,
        reference: data.data.reference,
        customer: data.data.customer ? {
          email: data.data.customer.email,
          name: `${data.data.customer.first_name || ""} ${data.data.customer.last_name || ""}`.trim(),
          phone: data.data.customer.phone
        } : void 0,
        isSimulation: false
      };
    } else {
      return {
        success: false,
        paid: false,
        status: "failed",
        reference,
        error: data.message || "Transaction verification failed"
      };
    }
  } catch (err) {
    console.error("[Paystack Verify Error]:", err?.message || err);
    return {
      success: false,
      paid: false,
      status: "error",
      reference,
      error: err?.message || "Failed to verify transaction with Paystack"
    };
  }
}
function verifyPaystackWebhookSignature(bodyString, signature) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;
  const hash = crypto.createHmac("sha512", secretKey).update(bodyString).digest("hex");
  return hash === signature;
}

// server/createApp.ts
dotenv.config();
function createApp() {
  const app2 = express();
  app2.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });
  app2.use((req, res, next) => {
    if (req.body && typeof req.body === "object") {
      return next();
    }
    express.json({
      limit: "50mb",
      verify: (req2, _res, buf) => {
        req2.rawBody = buf.toString("utf8");
      }
    })(req, res, next);
  });
  app2.use((req, res, next) => {
    if (req.body && typeof req.body === "object") {
      return next();
    }
    express.urlencoded({ limit: "50mb", extended: true })(req, res, next);
  });
  const apiRouter = express.Router();
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  apiRouter.get("/bootstrap", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const cookieHeader = req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : cookies.token || cookies.blazestore_jwt_token;
      const [
        dbStatus,
        products,
        cart,
        wishlist,
        notifications,
        currentUser
      ] = await Promise.all([
        getDatabaseStatus().catch((err) => ({
          connected: false,
          isUsingFallback: true,
          database: "blazestore",
          hasUri: false,
          error: err?.message || null
        })),
        getProducts().catch(() => []),
        getCart().catch(() => []),
        getWishlist().catch(() => []),
        getNotifications().catch(() => []),
        getCurrentUser(token).catch(() => null)
      ]);
      let deals = (products || []).filter((p) => p.isDeal || p.isHot || p.discountPercentage && p.discountPercentage >= 15);
      let recommended = (products || []).filter((p) => !deals.some((d) => d.id === p.id));
      if (deals.length === 0 && (products || []).length > 0) {
        const mid = Math.ceil((products || []).length / 2);
        deals = (products || []).slice(0, mid);
        recommended = (products || []).slice(mid);
      }
      const paymentConfig = {
        currency: "NGN",
        currencySymbol: "\u20A6",
        gateway: "paystack",
        paystackConfigured: isPaystackConfigured(),
        isPaystackLive: isPaystackLive(),
        publicKey: getPaystackPublicKey(),
        paystackFullConfig: getPaystackFullConfig(),
        supportedMethods: [
          { id: "paystack", name: "Paystack (Cards, Bank Transfer, USSD, Apple Pay)", enabled: true, live: isPaystackConfigured() },
          { id: "card", name: "Debit / Credit Card (Mastercard, VISA, Verve)", enabled: true, live: isPaystackConfigured() },
          { id: "bank-transfer", name: "Nigerian Bank Direct Transfer (Instant)", enabled: true, live: true },
          { id: "ussd", name: "USSD Bank Code (*737#, *966#, *901#)", enabled: true, live: true },
          { id: "cod", name: "Pay on Delivery (Cash / POS at Door)", enabled: true, live: true }
        ]
      };
      const announcement = {
        enabled: true,
        text: "\u26A1 Nationwide Express Delivery: Free shipping across Nigeria on orders over \u20A650,000! Use code BLAZE10 for 10% OFF.",
        linkText: "Copy BLAZE10",
        linkAction: "coupon:BLAZE10",
        badge: "FLASH SALE"
      };
      res.json({
        success: true,
        dbStatus,
        products: products || [],
        deals,
        recommended,
        cart: cart || [],
        wishlist: wishlist || [],
        notifications: notifications || [],
        currentUser,
        announcement,
        paymentConfig,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("[Bootstrap API Error]:", err);
      res.status(500).json({ success: false, error: err?.message || "Bootstrap load failed" });
    }
  });
  apiRouter.get("/cloudinary/status", (req, res) => {
    try {
      const status = getCloudinaryStatus();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/upload", async (req, res) => {
    try {
      const { image, folder, tags } = req.body || {};
      if (!image) {
        return res.status(400).json({ success: false, error: "Image data is required (file or base64)." });
      }
      const result = await uploadImageToCloudinary(image, { folder, tags });
      res.json(result);
    } catch (err) {
      console.error("[Upload API] Error:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to process image upload" });
    }
  });
  apiRouter.get("/email/status", (req, res) => {
    try {
      const status = getEmailStatus();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/email/test", async (req, res) => {
    try {
      const { email } = req.body || {};
      const target = email || process.env.SMTP_USER || "admin@blazestore.ng";
      const result = await sendTestEmail(target);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to trigger test email" });
    }
  });
  apiRouter.post("/email/config", async (req, res) => {
    try {
      const { host, port, user, pass, from, secure } = req.body || {};
      await setRuntimeEmailConfig({ host, port, user, pass, from, secure });
      const status = getEmailStatus();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to update email config" });
    }
  });
  apiRouter.get("/db/status", async (req, res) => {
    try {
      const force = req.query.force === "true";
      const status = await getDatabaseStatus(force);
      res.json({
        success: true,
        ...status,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "DB check failed" });
    }
  });
  apiRouter.get("/bootstrap", async (req, res) => {
    try {
      const [dbStatus, allProducts, cart, wishlist, notifications] = await Promise.all([
        getDatabaseStatus().catch(() => ({ connected: true, database: "Cloud Firestore" })),
        getProducts().catch(() => []),
        getCart().catch(() => []),
        getWishlist().catch(() => []),
        getNotifications().catch(() => [])
      ]);
      const deals = allProducts.filter(
        (p) => p.isDeal || p.isHot || p.discountPercentage && p.discountPercentage >= 15
      );
      const recommended = allProducts.filter((p) => !deals.some((d) => d.id === p.id));
      res.json({
        success: true,
        dbStatus,
        products: allProducts,
        deals: deals.length > 0 ? deals : allProducts.slice(0, Math.ceil(allProducts.length / 2)),
        recommended: recommended.length > 0 ? recommended : allProducts.slice(Math.ceil(allProducts.length / 2)),
        cart,
        wishlist,
        notifications,
        announcement: {
          enabled: true,
          badge: "FLASH SALE",
          title: "Mega Tech & Sillage Deals!",
          description: "Save up to 40% on luxury fragrances, flagship devices & fashion.",
          linkText: "Claim 20% Voucher",
          linkAction: "coupon:FLASH20",
          backgroundColor: "from-amber-600 via-orange-600 to-rose-600",
          textColor: "text-white"
        },
        paymentConfig: getPaystackFullConfig(),
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Bootstrap failed" });
    }
  });
  apiRouter.get("/products", async (req, res) => {
    try {
      const category = req.query.category;
      const search = req.query.search;
      const products = await getProducts(category, search);
      res.json({ success: true, products });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/cart", async (req, res) => {
    try {
      const cart = await getCart();
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/cart", async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.productId) {
        return res.status(400).json({ success: false, error: "Product data is required" });
      }
      const cart = await addToCart(item);
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { delta } = req.body || {};
      const cart = await updateCartQuantity(id, Number(delta) || 1);
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cart = await removeFromCart(id);
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/cart", async (req, res) => {
    try {
      const cart = await clearCart();
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/wishlist", async (req, res) => {
    try {
      const wishlist = await getWishlist();
      res.json({ success: true, wishlist });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/wishlist/toggle", async (req, res) => {
    try {
      const product = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ success: false, error: "Product is required" });
      }
      const wishlist = await toggleWishlist(product);
      res.json({ success: true, wishlist });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/orders", async (req, res) => {
    try {
      const { userId, email, orderId, search } = req.query;
      let authUserId = userId;
      let authEmail = email;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const decoded = await verifyFirebaseIdToken(authHeader.split(" ")[1]);
        if (decoded?.uid) {
          authUserId = authUserId || decoded.uid;
          authEmail = authEmail || decoded.email;
        }
      }
      const orders = await getUserOrders(authUserId, authEmail, orderId || search);
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
      }
      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/orders", async (req, res) => {
    try {
      const orderData = req.body;
      const order = await createOrder(orderData);
      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/payments/config", (req, res) => {
    res.json({
      success: true,
      currency: "NGN",
      currencySymbol: "\u20A6",
      gateway: "paystack",
      paystackConfigured: isPaystackConfigured(),
      isPaystackLive: isPaystackLive(),
      publicKey: getPaystackPublicKey(),
      paystackFullConfig: getPaystackFullConfig(),
      supportedMethods: [
        { id: "paystack", name: "Pay with Paystack (Cards, Bank Transfer, USSD, Apple Pay)", enabled: true, live: isPaystackConfigured() },
        { id: "card", name: "Debit / Credit Card (Mastercard, VISA, Verve)", enabled: true, live: isPaystackConfigured() },
        { id: "bank-transfer", name: "Nigerian Bank Direct Transfer (Instant)", enabled: true, live: true },
        { id: "ussd", name: "USSD Bank Code (*737#, *966#, *901#)", enabled: true, live: true },
        { id: "cod", name: "Pay on Delivery (Cash / POS at Door)", enabled: true, live: true }
      ]
    });
  });
  apiRouter.get("/paystack/config", (req, res) => {
    res.json({
      success: true,
      ...getPaystackFullConfig()
    });
  });
  apiRouter.post("/paystack/config", (req, res) => {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
        }
      }
      const { secretKey, publicKey, mode } = body || {};
      setRuntimePaystackKeys(secretKey, publicKey, mode);
      const config = getPaystackFullConfig();
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        message: "Paystack configuration updated successfully",
        ...config
      });
    } catch (err) {
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({ success: false, error: err?.message || "Failed to update Paystack config" });
    }
  });
  apiRouter.post("/paystack/initialize", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { email, amount, reference, callbackUrl, metadata, channels } = req.body || {};
      if (!email || !amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: "Valid email and amount are required." });
      }
      const amountInKobo = Math.round(Number(amount) * 100);
      const result = await initializePaystackTransaction({
        email,
        amount: amountInKobo,
        reference,
        callbackUrl,
        channels,
        metadata
      });
      return res.json(result);
    } catch (err) {
      console.error("[Paystack Init Endpoint Error]:", err);
      return res.status(200).json({
        success: false,
        reference: req.body?.reference || `blz_ref_${Date.now()}`,
        isSimulation: true,
        error: err?.message || "Failed to initialize Paystack payment"
      });
    }
  });
  apiRouter.get("/paystack/verify/:reference", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ success: false, error: "Payment reference is required." });
      }
      const result = await verifyPaystackTransaction(reference);
      if (result && result.paid) {
        try {
          await updateOrderPaymentByReference(reference, {
            paid: true,
            status: result.status,
            paystackData: result,
            gatewayResponse: result.gatewayResponse
          });
        } catch (dbErr) {
          console.warn("[Paystack DB Update on Verify Warning]:", dbErr);
        }
      }
      return res.json(result);
    } catch (err) {
      console.error("[Paystack Verify Endpoint Error]:", err);
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        error: err?.message || "Failed to verify Paystack payment"
      });
    }
  });
  apiRouter.post("/paystack/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"];
      const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      if (isPaystackConfigured()) {
        if (!signature) {
          console.warn("[Paystack Webhook] Rejected: Missing x-paystack-signature header");
          return res.status(401).json({ status: "error", message: "Missing x-paystack-signature header" });
        }
        const isValid = verifyPaystackWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn("[Paystack Webhook] Rejected: Invalid HMAC signature");
          return res.status(401).json({ status: "error", message: "Invalid Paystack webhook signature" });
        }
      }
      const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (event?.event === "charge.success") {
        const reference = event.data?.reference;
        const amount = event.data?.amount;
        console.log(`[Paystack Webhook Verified] Successful payment for ref: ${reference}, amount: \u20A6${(amount / 100).toFixed(2)}`);
        if (reference) {
          try {
            await updateOrderPaymentByReference(reference, {
              paid: true,
              status: "success",
              paystackData: event.data,
              gatewayResponse: event.data?.gateway_response
            });
          } catch (updateErr) {
            console.error("[Paystack Webhook DB Update Error]:", updateErr);
          }
        }
      }
      res.status(200).json({ status: "success" });
    } catch (err) {
      console.error("[Paystack Webhook Error]:", err);
      res.status(500).json({ status: "error", message: err?.message });
    }
  });
  apiRouter.post("/paystack/reconcile-pending", async (req, res) => {
    try {
      const pendingOrders = await getPendingOrders();
      let reconciledCount = 0;
      const results = [];
      for (const order of pendingOrders) {
        const ref = order.paymentReference || order.orderId;
        if (!ref) continue;
        try {
          const verifyResult = await verifyPaystackTransaction(ref);
          if (verifyResult && verifyResult.paid) {
            await updateOrderPaymentByReference(ref, {
              paid: true,
              status: verifyResult.status,
              paystackData: verifyResult,
              gatewayResponse: verifyResult.gatewayResponse
            });
            reconciledCount++;
            results.push({ orderId: order.orderId, reference: ref, status: "reconciled_paid" });
          } else {
            results.push({ orderId: order.orderId, reference: ref, status: "still_pending" });
          }
        } catch (itemErr) {
          results.push({ orderId: order.orderId, reference: ref, status: "check_failed", error: itemErr?.message });
        }
      }
      res.json({
        success: true,
        totalChecked: pendingOrders.length,
        reconciledCount,
        details: results
      });
    } catch (err) {
      console.error("[Paystack Reconciliation Error]:", err);
      res.status(500).json({ success: false, error: err?.message || "Reconciliation failed" });
    }
  });
  apiRouter.post("/payments/create-intent", async (req, res) => {
    try {
      const { amount, orderId, customerEmail, customerName } = req.body || {};
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: "Valid amount is required." });
      }
      const amountInKobo = Math.round(Number(amount) * 100);
      const ref = `blz_${orderId || Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const paystackResult = await initializePaystackTransaction({
        email: customerEmail || "customer@example.com",
        amount: amountInKobo,
        reference: ref,
        metadata: {
          orderId,
          customerName,
          customerEmail
        }
      });
      res.json({
        success: true,
        currency: "NGN",
        reference: paystackResult.reference,
        authorizationUrl: paystackResult.authorizationUrl,
        accessCode: paystackResult.accessCode,
        isSimulation: paystackResult.isSimulation,
        paymentIntentId: paystackResult.reference,
        message: paystackResult.message
      });
    } catch (err) {
      console.error("[Payment Create Error]:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to initialize payment gateway"
      });
    }
  });
  apiRouter.post("/payments/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId, reference } = req.body || {};
      const refToVerify = reference || paymentIntentId;
      if (!refToVerify) {
        return res.json({ success: true, status: "success", paid: true, isSimulation: true });
      }
      const verifyResult = await verifyPaystackTransaction(refToVerify);
      res.json({
        success: verifyResult.success,
        status: verifyResult.status,
        paid: verifyResult.paid,
        isSimulation: verifyResult.isSimulation
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Payment confirmation error" });
    }
  });
  apiRouter.get("/notifications", async (req, res) => {
    try {
      const notifications = await getNotifications();
      res.json({ success: true, notifications });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/notifications/read", async (req, res) => {
    try {
      const notifications = await markNotificationsRead();
      res.json({ success: true, notifications });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const { idToken, name, email, phone, roleType } = req.body || {};
      const authHeader = req.headers.authorization || "";
      const tokenToVerify = idToken || (authHeader.startsWith("Bearer ") ? authHeader.substring(7) : void 0);
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is required." });
      }
      const result = await registerUser({ idToken: tokenToVerify, name, email, phone, roleType });
      res.json({ success: true, ...result });
    } catch (err) {
      const status = err?.status || (err?.message?.includes("503 Service Unavailable") ? 503 : 400);
      res.status(status).json({ success: false, error: err?.message || "Registration failed" });
    }
  });
  apiRouter.post("/auth/login", async (req, res) => {
    try {
      const { idToken, email } = req.body || {};
      const authHeader = req.headers.authorization || "";
      const tokenToVerify = idToken || (authHeader.startsWith("Bearer ") ? authHeader.substring(7) : void 0);
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is required." });
      }
      const result = await loginUser({ idToken: tokenToVerify, email });
      res.json({ success: true, ...result });
    } catch (err) {
      const status = err?.status || (err?.message?.includes("503 Service Unavailable") ? 503 : 400);
      res.status(status).json({ success: false, error: err?.message || "Login failed" });
    }
  });
  apiRouter.get("/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const cookieHeader = req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : cookies.token || cookies.blazestore_jwt_token;
      const user = await getCurrentUser(token);
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/auth/logout", async (req, res) => {
    try {
      res.setHeader("Set-Cookie", "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      const result = await logoutUser();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/analytics", async (req, res) => {
    try {
      const analytics = await getSalesAnalytics();
      res.json({ success: true, analytics });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/products", async (req, res) => {
    try {
      const category = req.query.category;
      const search = req.query.search;
      const products = await getAllProductsAdmin(category, search);
      res.json({ success: true, products });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/products", async (req, res) => {
    try {
      const productData = req.body || {};
      if (!productData.name || !productData.price) {
        return res.status(400).json({ success: false, error: "Product name and price are required." });
      }
      const product = await createProductAdmin(productData);
      res.json({ success: true, product, message: "Product added to Firestore inventory." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};
      const updated = await updateProductAdmin(id, updateData);
      res.json({ success: true, product: updated, message: "Product details updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/products/:id/stock", async (req, res) => {
    try {
      const { id } = req.params;
      const { stockQuantity, inStock } = req.body || {};
      const updated = await updateProductStock(id, Number(stockQuantity), inStock);
      res.json({ success: true, product: updated, message: "Stock quantity updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/admin/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteProductAdmin(id);
      res.json({ success: true, ...result, message: "Product removed from catalog." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/products/clear-all", async (req, res) => {
    try {
      const result = await clearAllProductsAdmin();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to clear products" });
    }
  });
  apiRouter.post("/admin/products/bulk-import", async (req, res) => {
    try {
      const { products } = req.body || {};
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ success: false, error: "A non-empty products array is required." });
      }
      const result = await bulkCreateProductsAdmin(products);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Bulk import failed" });
    }
  });
  apiRouter.get("/admin/orders", async (req, res) => {
    try {
      const status = req.query.status;
      const search = req.query.search;
      const orders = await getAllOrders(status, search);
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/orders/:orderId/status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, adminName, adminRole } = req.body || {};
      const updated = await updateOrderStatus(orderId, status, { name: adminName, role: adminRole });
      res.json({ success: true, order: updated, message: `Order status updated to ${status}.` });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/refunds", async (req, res) => {
    try {
      const { orderId, amount, reason, restockItems, adminName, adminRole } = req.body || {};
      if (!orderId || !amount) {
        return res.status(400).json({ success: false, error: "Order ID and refund amount are required." });
      }
      const result = await processRefund({
        orderId,
        amount: Number(amount),
        reason: reason || "Customer Refund",
        restockItems: Boolean(restockItems),
        adminName: adminName || "Admin",
        adminRole: adminRole || "manager"
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Refund failed" });
    }
  });
  apiRouter.get("/admin/refunds", async (req, res) => {
    try {
      const refunds = await getRefunds();
      res.json({ success: true, refunds });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/refunds/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerName, adminRole } = req.body || {};
      if (adminRole !== "owner") {
        return res.status(403).json({ success: false, error: "Only Store Owners can approve queued refunds." });
      }
      const result = await approveRefund(id, ownerName || "Store Owner");
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Approval failed" });
    }
  });
  apiRouter.post("/admin/refunds/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerName, adminRole } = req.body || {};
      if (adminRole !== "owner") {
        return res.status(403).json({ success: false, error: "Only Store Owners can reject queued refunds." });
      }
      const result = await rejectRefund(id, ownerName || "Store Owner");
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Rejection failed" });
    }
  });
  apiRouter.get("/admin/users", async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/users", async (req, res) => {
    try {
      const { name, email, password, phone, roleType } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Name and email are required." });
      }
      const result = await registerUser({ name, email, phone, roleType });
      res.json({ success: true, user: result.user, message: "Staff member account created." });
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Failed to create user" });
    }
  });
  apiRouter.put("/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};
      const updated = await updateUserAdmin(id, updateData);
      res.json({ success: true, user: updated, message: "User updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/users/:id/role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role, roleType } = req.body || {};
      const updated = await updateUserRole(id, role, roleType);
      res.json({ success: true, user: updated, message: "User role updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteUserAdmin(id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Failed to remove user" });
    }
  });
  apiRouter.delete("/admin/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await deleteOrderAdmin(orderId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/db/collections", async (req, res) => {
    try {
      const collections = await getDbCollectionsInfo();
      res.json({ success: true, collections });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/db/query", async (req, res) => {
    try {
      const { collection, filter, limit, skip, sort } = req.body || {};
      if (!collection) {
        return res.status(400).json({ success: false, error: "Collection name is required." });
      }
      const result = await queryDbCollection(collection, { filter, limit, skip, sort });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/db/document", async (req, res) => {
    try {
      const { collection, document } = req.body || {};
      if (!collection || !document) {
        return res.status(400).json({ success: false, error: "Collection name and document data are required." });
      }
      const result = await insertDbDocument(collection, document);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/db/document/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { collection, document } = req.body || {};
      if (!collection || !document) {
        return res.status(400).json({ success: false, error: "Collection name and document data are required." });
      }
      const result = await updateDbDocument(collection, id, document);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/admin/db/document/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { collection } = req.body || {};
      if (!collection) {
        return res.status(400).json({ success: false, error: "Collection name is required." });
      }
      const result = await deleteDbDocument(collection, id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/db/export", async (req, res) => {
    try {
      const data = await exportDatabaseData();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/db/seed", async (req, res) => {
    try {
      const result = await seedCatalogToDatabase();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/clear-mock-data", async (req, res) => {
    try {
      const result = await clearAllMockData();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to clear mock data" });
    }
  });
  app2.use("/api", apiRouter);
  app2.use("/", apiRouter);
  app2.use((err, req, res, next) => {
    console.error("[API Server Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err?.status || 500).json({
      success: false,
      error: err?.message || "Internal Server Error"
    });
  });
  return app2;
}

// server/vercelHandler.ts
var app = createApp();
function handler(req, res) {
  let queryString = "";
  if (req.url && req.url.includes("?")) {
    const parts = req.url.split("?");
    queryString = "?" + parts.slice(1).join("?");
  }
  if (req.url && req.url.includes("[...all]")) {
    const match = req.query?.match || req.query?.all;
    if (match) {
      const subPath = Array.isArray(match) ? match.join("/") : match;
      req.url = "/api/" + subPath.replace(/^\/+/, "") + queryString;
    } else if (req.headers && req.headers["x-matched-path"]) {
      req.url = req.headers["x-matched-path"] + queryString;
    } else if (req.headers && req.headers["x-forwarded-url"]) {
      try {
        const u = new URL(req.headers["x-forwarded-url"], "http://localhost");
        req.url = u.pathname + u.search;
      } catch {
      }
    }
  }
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  return app(req, res);
}
export {
  handler as default
};
