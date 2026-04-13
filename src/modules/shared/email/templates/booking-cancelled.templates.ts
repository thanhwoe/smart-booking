import { BookingCancelledJobPayload } from '@app/interfaces/email-jobs.interface';
import { formatDate } from '@app/utils/format';

export function bookingCancelledTemplate(p: BookingCancelledJobPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Booking Cancelled — ${p.serviceName}`;

  const refundNote = p.refunded
    ? 'The payment has been refunded to your account within 5–10 business days.'
    : 'This booking was not paid, so no refund is required.';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #fff;
                 border-radius: 8px; overflow: hidden; border: 1px solid #e5e5e5; }
    .header { background: #18181b; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #fee2e2; color: #dc2626;
             font-size: 12px; font-weight: 600; padding: 4px 10px;
             border-radius: 20px; margin-bottom: 20px; }
    .card { background: #f4f4f5; border-radius: 6px; padding: 20px 24px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between;
           padding: 8px 0; border-bottom: 1px solid #e4e4e7; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 13px; color: #71717a; }
    .value { font-size: 13px; color: #18181b; font-weight: 500; }
    .refund-note { background: ${p.refunded ? '#f0fdf4' : '#fafafa'};
                   border: 1px solid ${p.refunded ? '#bbf7d0' : '#e5e5e5'};
                   border-radius: 6px; padding: 14px 16px;
                   font-size: 13px; color: ${p.refunded ? '#15803d' : '#71717a'}; }
    .footer { padding: 20px 32px; background: #fafafa;
              border-top: 1px solid #e5e5e5; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Smart Booking</h1></div>
    <div class="body">
      <p style="font-size: 15px; color: #3f3f46;">Hello <strong>${p.userName}</strong>,</p>
      <span class="badge">✕ Booking Cancelled</span>
      <div class="card">
        <div class="row">
          <span class="label">Service</span>
          <span class="value">${p.serviceName}</span>
        </div>
        <div class="row">
          <span class="label">Scheduled Time</span>
          <span class="value">${formatDate(p.startTime)}</span>
        </div>
        <div class="row">
          <span class="label">Booking ID</span>
          <span class="value" style="font-family: monospace; font-size: 12px;">${p.bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
      <div class="refund-note">${refundNote}</div>
    </div>
    <div class="footer">This is an automated email. Please do not reply.</div>
  </div>
</body>
</html>`;

  const text = `
Hello ${p.userName},

Your booking has been cancelled.

Service     : ${p.serviceName}
Scheduled   : ${formatDate(p.startTime)}
Booking ID  : ${p.bookingId.slice(0, 8).toUpperCase()}

${refundNote}
`.trim();

  return { subject, html, text };
}
