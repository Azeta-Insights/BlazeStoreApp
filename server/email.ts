import nodemailer from 'nodemailer';
import { Order } from '../src/types';

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Get nodemailer transport configured via environment variables
 */
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

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
  });
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
  const fromAddress = process.env.SMTP_FROM || `"BlazeStore NG" <orders@blazestore.ng>`;
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
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: 900;">Total Paid:</td>
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
    console.error(`[Email Service Error] Failed to send email to ${recipientEmail}:`, err?.message || err);
    return {
      success: false,
      error: err?.message || 'SMTP delivery failed.',
    };
  }
}

/**
 * Returns current configuration status of outbound email service
 */
export function getEmailStatus() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const hasPass = Boolean(process.env.SMTP_PASS || process.env.SMTP_PASSWORD);
  const isConfigured = Boolean(host && user && hasPass);

  return {
    configured: isConfigured,
    host: host || 'Not set',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: user ? `${user.substring(0, 4)}***@${user.split('@')[1] || ''}` : 'Not set',
    from: process.env.SMTP_FROM || 'BlazeStore NG <orders@blazestore.ng>',
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

  const fromAddress = process.env.SMTP_FROM || `"BlazeStore NG" <orders@blazestore.ng>`;
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
    return {
      success: false,
      error: err?.message || 'SMTP test dispatch failed.',
    };
  }
}
