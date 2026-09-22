import nodemailer from 'nodemailer';
import { Order } from '../src/types';
import { updateDbDocument, getDbDocument } from './db';

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

let runtimeSmtpHost: string = process.env.SMTP_HOST || 'smtp.gmail.com';
let runtimeSmtpPort: number = Number(process.env.SMTP_PORT) || 587;
let runtimeSmtpUser: string = process.env.SMTP_USER || '';
let runtimeSmtpPass: string = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
let runtimeSmtpFrom: string = process.env.SMTP_FROM || 'BlazeStore NG <noreply@blazestore.ng>';
let runtimeSmtpSecure: boolean = process.env.SMTP_SECURE === 'true';

export async function setRuntimeEmailConfig(config: {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  secure?: boolean;
}) {
  if (config.host !== undefined) runtimeSmtpHost = config.host.trim();
  if (config.port !== undefined) runtimeSmtpPort = Number(config.port) || 587;
  if (config.user !== undefined) runtimeSmtpUser = config.user.trim();
  if (config.pass !== undefined) runtimeSmtpPass = config.pass.trim();
  if (config.from !== undefined) runtimeSmtpFrom = config.from.trim();
  if (config.secure !== undefined) runtimeSmtpSecure = Boolean(config.secure);

  try {
    await updateDbDocument('settings', 'smtp', {
      host: runtimeSmtpHost,
      port: runtimeSmtpPort,
      user: runtimeSmtpUser,
      pass: runtimeSmtpPass,
      from: runtimeSmtpFrom,
      secure: runtimeSmtpSecure,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[SMTP Settings] Could not persist SMTP settings to database:', err);
  }
}

/**
 * Load persisted SMTP settings from Firestore settings collection on startup
 */
export async function loadSmtpConfigFromDb(): Promise<void> {
  try {
    const saved = await getDbDocument<{
      host?: string;
      port?: number;
      user?: string;
      pass?: string;
      from?: string;
      secure?: boolean;
    }>('settings', 'smtp');

    if (saved) {
      if (saved.host) runtimeSmtpHost = saved.host;
      if (saved.port) runtimeSmtpPort = Number(saved.port) || 587;
      if (saved.user) runtimeSmtpUser = saved.user;
      if (saved.pass) runtimeSmtpPass = saved.pass;
      if (saved.from) runtimeSmtpFrom = saved.from;
      if (saved.secure !== undefined) runtimeSmtpSecure = Boolean(saved.secure);
    }
  } catch (err) {
    console.warn('[SMTP Settings] Could not load SMTP settings from database:', err);
  }
}

// Automatically load on initialization
loadSmtpConfigFromDb().catch(() => {});

/**
 * Get nodemailer transport configured via environment variables or runtime settings
 */
function getEmailTransporter() {
  let host = (runtimeSmtpHost || process.env.SMTP_HOST || '').trim();
  const port = runtimeSmtpPort || Number(process.env.SMTP_PORT) || 587;
  const user = (runtimeSmtpUser || process.env.SMTP_USER || '').trim();
  let pass = (runtimeSmtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();

  // If user is a Gmail address and host is empty, default host to smtp.gmail.com
  if (!host && user.toLowerCase().endsWith('@gmail.com')) {
    host = 'smtp.gmail.com';
  }

  // If using Gmail or Google SMTP, strip spaces and dashes from 16-char App Password (e.g. "abcd efgh ijkl mnop")
  if ((host.includes('gmail.com') || host.includes('googlemail.com') || user.toLowerCase().endsWith('@gmail.com')) && pass) {
    pass = pass.replace(/[\s-]+/g, '');
  }

  const secure = runtimeSmtpSecure || process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    name: 'blazestore.ng',
  });
}

function getSenderFromAddress(user: string): string {
  const activeUser = (user || runtimeSmtpUser || process.env.SMTP_USER || '').trim();
  const rawFrom = (runtimeSmtpFrom || process.env.SMTP_FROM || '').trim();

  if (rawFrom) {
    // If rawFrom contains a URL (like https://...), strip out the URL so only clean name remains
    if (rawFrom.includes('http://') || rawFrom.includes('https://') || rawFrom.includes('.vercel.app')) {
      const cleanName = rawFrom
        .replace(/<https?:\/\/[^>]+>/gi, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[<>]/g, '')
        .trim() || 'BlazeStore NG';
      return `"${cleanName}" <${activeUser}>`;
    }

    // If rawFrom has a valid email inside <...>
    const emailMatch = rawFrom.match(/<([^>]+@[^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      const namePart = rawFrom.replace(/<[^>]+>/, '').trim() || 'BlazeStore NG';
      const cleanName = namePart.replace(/^["']|["']$/g, '').trim();
      return `"${cleanName}" <${emailMatch[1]}>`;
    }

    // If rawFrom is just a display name without email address
    if (!rawFrom.includes('@')) {
      const cleanName = rawFrom.replace(/^["']|["']$/g, '').trim();
      return `"${cleanName || 'BlazeStore NG'}" <${activeUser}>`;
    }

    return rawFrom;
  }

  if (activeUser && activeUser.includes('@')) {
    return `"BlazeStore NG" <${activeUser}>`;
  }
  return `"BlazeStore NG" <orders@blazestore.ng>`;
}

/**
 * Formats amount into Nigerian Naira string
 */
function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Sends a rich order confirmation email to the customer
 */
export async function sendOrderConfirmationEmail(order: Order): Promise<EmailSendResult> {
  const recipientEmail = order.customer?.email;
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn('[Email Service] Skipping email dispatch: Invalid customer email on order', order.id);
    return { success: false, error: 'Recipient email is missing or invalid.' };
  }

  const transporter = getEmailTransporter();
  const smtpUser = (runtimeSmtpUser || process.env.SMTP_USER || '').trim();
  const fromAddress = getSenderFromAddress(smtpUser);
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #EDEDF2;">
          <strong>${item.name}</strong>
          ${item.variant ? `<br><small style="color: #6B7280;">Variant: ${item.variant}</small>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #EDEDF2; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #EDEDF2; text-align: right;">${formatNaira(item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join('');

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
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for your order! 🎉</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px;">
            <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">
              Hello <strong>${order.customer?.name || 'Valued Customer'}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #52525B;">
              We have received your order <strong>#${order.orderId || order.id}</strong>. Our logistics team is already preparing it for delivery.
            </p>

            <!-- Order Summary Box -->
            <div style="background-color: #FAFAFA; border: 1px solid #F4F4F5; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #71717A; margin-bottom: 8px;">
                <span>Order Reference: <strong>${order.orderId || order.id}</strong></span>
                <span>Payment Status: <strong style="color: ${order.paymentStatus === 'paid' ? '#10B981' : '#F59E0B'};">${(order.paymentStatus || 'processing').toUpperCase()}</strong></span>
              </div>
              <div style="font-size: 13px; color: #71717A;">
                <span>Payment Method: <strong>${order.paymentMethod || 'Paystack'}</strong></span>
                ${order.paymentRef ? `<br><span>Transaction Ref: <code style="background: #E4E4E7; padding: 2px 4px; border-radius: 4px;">${order.paymentRef}</code></span>` : ''}
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
                </tr>` : ''}
                <tr>
                  <td colspan="2" style="padding: 8px 12px; text-align: right; color: #71717A;">Delivery Fee:</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${order.shipping === 0 ? 'FREE' : formatNaira(order.shipping || 0)}</td>
                </tr>
                <tr style="border-top: 2px solid #18181B; font-size: 16px;">
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: 900;">Total Order Amount:</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900; color: #7C6FE0;">${formatNaira(order.total || 0)}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Delivery Address -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-top: 24px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 800; color: #334155;">📍 Delivery Address</h4>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                ${order.customer?.name || ''}<br>
                ${order.customer?.address || 'Standard Delivery'}<br>
                ${order.customer?.city || ''}, ${order.customer?.state || ''}, ${(order.customer as any)?.country || 'Nigeria'}<br>
                📞 ${order.customer?.phone || 'Not provided'}
              </p>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #71717A; margin-top: 28px; text-align: center;">
              Need help with this order? Contact our support team at <a href="mailto:support@blazestore.ng" style="color: #7C6FE0; text-decoration: none; font-weight: 600;">support@blazestore.ng</a> or call <strong>+234 800 2529 378</strong>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #FAFAFA; border-top: 1px solid #F4F4F5; padding: 20px; text-align: center; font-size: 12px; color: #A1A1AA;">
            © ${new Date().getFullYear()} BlazeStore Nigeria. All rights reserved.
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
      messageId: `sim-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `Order Confirmed #${order.orderId || order.id} - BlazeStore`,
      html: htmlContent,
    });

    console.log(`[Email Service] Order confirmation email sent to ${recipientEmail} for order #${order.orderId || order.id}. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (err: any) {
    const friendlyError = formatSmtpError(err);
    console.warn(`[Email Dispatch Notice] Could not deliver email to ${recipientEmail}:`, friendlyError);
    return {
      success: false,
      error: friendlyError,
    };
  }
}

/**
 * Returns current configuration status of outbound email service
 */
function formatSmtpError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('535 5.7.139') || msg.includes('SmtpClientAuthentication is disabled')) {
    return 'Microsoft 365 / Outlook error (535 5.7.139): Authenticated SMTP is disabled for this mailbox by Microsoft policy. Please enable SMTP AUTH in Microsoft 365 Admin Center, or use Gmail SMTP with a 16-character App Password (smtp.gmail.com:587).';
  }
  if (msg.includes('535-5.7.8') || msg.includes('Username and Password not accepted') || msg.includes('BadCredentials') || msg.includes('535 5.7.8')) {
    return 'Authentication failed: Invalid email or password. If using Gmail, please create and use a 16-character Google App Password (not your personal account password).';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
    return `Connection to SMTP host failed (${err.code || 'Network Error'}). Please check your SMTP Host address and Port number.`;
  }
  return msg;
}

export function getEmailStatus() {
  const host = runtimeSmtpHost || process.env.SMTP_HOST;
  const user = runtimeSmtpUser || process.env.SMTP_USER;
  const hasPass = Boolean(runtimeSmtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD);
  const isConfigured = Boolean(host && user && hasPass);

  return {
    configured: isConfigured,
    host: host || 'Not set',
    port: runtimeSmtpPort || Number(process.env.SMTP_PORT) || 587,
    secure: runtimeSmtpSecure || process.env.SMTP_SECURE === 'true',
    user: user ? `${user.substring(0, 4)}***@${user.split('@')[1] || ''}` : 'Not set',
    from: runtimeSmtpFrom || process.env.SMTP_FROM || 'BlazeStore NG <orders@blazestore.ng>',
  };
}

/**
 * Sends a test email to verify credentials
 */
export async function sendTestEmail(targetEmail: string): Promise<EmailSendResult> {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return {
      success: false,
      error: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in environment variables.',
    };
  }

  const fromAddress = getSenderFromAddress((runtimeSmtpUser || process.env.SMTP_USER || '').trim());
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetEmail,
      subject: '✅ BlazeStore Outbound Email Test Successful',
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #1E293B;">
          <h2 style="color: #4F46E5;">Email Delivery Connected! 🎉</h2>
          <p>This is a verification test from your <strong>BlazeStore Nigeria</strong> store platform.</p>
          <p>Your SMTP email configuration is active and ready to deliver real-time order receipts, customer invoices, and delivery updates.</p>
          <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94A3B8;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (err: any) {
    const friendly = formatSmtpError(err);
    return {
      success: false,
      error: friendly,
    };
  }
}
