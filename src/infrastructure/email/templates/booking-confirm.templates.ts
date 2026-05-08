import { formatAmount, formatDate } from '@app/utils/format';
import { BookingConfirmedPayload } from '@application/common/ports/queue.port';
export function bookingConfirmedTemplate(p: BookingConfirmedPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Booking Confirmed — ${p.serviceName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #fff;
                 border-radius: 8px; overflow: hidden;
                 border: 1px solid #e5e5e5; }
    .header { background: #18181b; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; }
    .greeting { font-size: 15px; color: #3f3f46; margin-bottom: 24px; }
    .card { background: #f4f4f5; border-radius: 6px; padding: 20px 24px;
            margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between;
           padding: 8px 0; border-bottom: 1px solid #e4e4e7; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 13px; color: #71717a; }
    .value { font-size: 13px; color: #18181b; font-weight: 500; text-align: right; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d;
             font-size: 12px; font-weight: 600; padding: 4px 10px;
             border-radius: 20px; margin-bottom: 20px; }
    .footer { padding: 20px 32px; background: #fafafa;
              border-top: 1px solid #e5e5e5; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Smart Booking</h1>
    </div>
    <div class="body">
      <p class="greeting">Hello <strong>${p.userName}</strong>,</p>
      <span class="badge">✓ Booking Confirmed</span>
      <div class="card">
        <div class="row">
          <span class="label">Service</span>
          <span class="value">${p.serviceName}</span>
        </div>
        <div class="row">
          <span class="label">Provider</span>
          <span class="value">${p.providerName}</span>
        </div>
        <div class="row">
          <span class="label">Start Time</span>
          <span class="value">${formatDate(p.startTime)}</span>
        </div>
        <div class="row">
          <span class="label">End Time</span>
          <span class="value">${formatDate(p.endTime)}</span>
        </div>
        <div class="row">
          <span class="label">Booking ID</span>
          <span class="value" style="font-family: monospace; font-size: 12px;">${p.bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Paid</span>
          <span class="value" style="color: #15803d;">${formatAmount(p.amount, p.currency)}</span>
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a; margin: 0;">
        If you need to reschedule or cancel, please contact us at least 24 hours in advance.
      </p>
    </div>
    <div class="footer">
      This is an automated email. Please do not reply.
    </div>
  </div>
</body>
</html>`;

  const text = `
Hello ${p.userName},

Your booking has been confirmed!

Service     : ${p.serviceName}
Provider    : ${p.providerName}
Start Time  : ${formatDate(p.startTime)}
End Time    : ${formatDate(p.endTime)}
Booking ID  : ${p.bookingId.slice(0, 8).toUpperCase()}
Payment     : ${formatAmount(p.amount, p.currency)}

Thank you for using our service!
`.trim();

  return { subject, html, text };
}
