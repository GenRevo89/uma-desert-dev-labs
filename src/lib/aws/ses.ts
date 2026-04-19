import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize SES client safely using environment variables
const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function sendWorkOrderEmail(
  toEmail: string, 
  workerName: string, 
  workOrderId: string, 
  taskDescription: string,
  baseUrl?: string,
) {
  const fromAddress = process.env.SES_FROM_ADDRESS || 'founders@theutilitycompany.co';
  const origin = baseUrl || 'http://localhost:3001';
  const acceptLink = `${origin}/worker?order=${workOrderId}`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(160deg, #060a10 0%, #0a1628 40%, #0c1a2e 70%, #060a10 100%); padding: 40px 20px; min-height: 100vh;">
      <div style="max-width: 520px; margin: 0 auto; background: rgba(17, 24, 39, 0.9); border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.4);">
        
        <!-- Header -->
        <div style="padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: rgba(34,197,94,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #22c55e; font-size: 14px;">🌿</span>
            </div>
            <span style="color: #22c55e; font-weight: 700; font-size: 18px; letter-spacing: -0.3px;">Uma</span>
          </div>
        </div>

        <!-- Order ID -->
        <div style="padding: 28px 28px 20px;">
          <div style="display: inline-block; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 6px 14px; margin-bottom: 16px;">
            <span style="color: #f59e0b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">⚡ Action Required</span>
          </div>
          <h1 style="color: #f0fdf4; font-size: 22px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.5px;">Work Order ${workOrderId}</h1>
          <p style="color: rgba(255,255,255,0.35); font-size: 13px; margin: 0;">Uma Digital Twin Dispatch</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 0 28px 20px;">
          <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin: 0; line-height: 1.6;">
            Hello <strong style="color: #f0fdf4;">${workerName}</strong>,<br/>
            Uma has detected a critical anomaly in the grow environment and requires your physical intervention.
          </p>
        </div>

        <!-- Task Card -->
        <div style="margin: 0 28px 24px; padding: 20px; background: rgba(245,158,11,0.05); border-left: 3px solid rgba(245,158,11,0.5); border-radius: 0 10px 10px 0;">
          <div style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">Task Details</div>
          <p style="color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.65; margin: 0;">${taskDescription}</p>
        </div>

        <!-- CTA Button -->
        <div style="padding: 0 28px 32px; text-align: center;">
          <a href="${acceptLink}" style="display: inline-block; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; padding: 14px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 20px rgba(34,197,94,0.25); letter-spacing: 0.2px;">
            Open Worker Terminal →
          </a>
          <p style="color: rgba(255,255,255,0.25); font-size: 12px; margin: 14px 0 0; line-height: 1.5;">
            Complete the task in the facility, then submit your completion report via the link above.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
          <p style="font-size: 11px; color: rgba(255,255,255,0.15); margin: 0; line-height: 1.6;">
            Automated dispatch from Uma — Digital Twin System<br/>
            Desert Dev Labs • The Utility Company
          </p>
        </div>
      </div>
    </div>
  `;

  const params = {
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: htmlBody },
        Text: { Charset: "UTF-8", Data: `Work Order: ${taskDescription}\nLog in to terminal to complete: ${acceptLink}` },
      },
      Subject: { Charset: "UTF-8", Data: `Action Required: Uma Work Order ${workOrderId}` },
    },
    Source: fromAddress,
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`SES Email dispatched successfully to ${toEmail}. Msg ID: ${response.MessageId}`);
    return true;
  } catch (error) {
    console.error("Error dispatching SES email:", error);
    return false;
  }
}

export async function sendWorkOrderReminder(
  toEmail: string,
  workerName: string,
  workOrderId: string,
  taskDescription: string,
  reminderNumber: number,
  baseUrl?: string,
) {
  const fromAddress = process.env.SES_FROM_ADDRESS || 'founders@theutilitycompany.co';
  const origin = baseUrl || 'http://localhost:3001';
  const acceptLink = `${origin}/worker?order=${workOrderId}`;

  const urgency = reminderNumber >= 3 ? 'CRITICAL' : reminderNumber >= 2 ? 'HIGH' : 'FOLLOW-UP';
  const urgencyColor = reminderNumber >= 3 ? '#ef4444' : reminderNumber >= 2 ? '#f59e0b' : '#6366f1';

  const htmlBody = `
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(160deg, #060a10 0%, #0a1628 40%, #0c1a2e 70%, #060a10 100%); padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: rgba(17, 24, 39, 0.9); border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.4);">
        
        <!-- Header -->
        <div style="padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #22c55e; font-weight: 700; font-size: 18px;">🌿 Uma</span>
          </div>
        </div>

        <!-- Urgency Badge -->
        <div style="padding: 28px 28px 20px;">
          <div style="display: inline-block; background: ${urgencyColor}15; border: 1px solid ${urgencyColor}40; border-radius: 8px; padding: 6px 14px; margin-bottom: 16px;">
            <span style="color: ${urgencyColor}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🔔 Reminder #${reminderNumber} — ${urgency}</span>
          </div>
          <h1 style="color: #f0fdf4; font-size: 22px; font-weight: 700; margin: 0 0 4px;">Work Order ${workOrderId}</h1>
          <p style="color: rgba(255,255,255,0.35); font-size: 13px; margin: 0;">This task is still awaiting completion</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 0 28px 20px;">
          <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin: 0; line-height: 1.6;">
            Hello <strong style="color: #f0fdf4;">${workerName}</strong>,<br/>
            This is an automated reminder that your assigned work order has not been completed yet. The grow environment requires your attention.
          </p>
        </div>

        <!-- Task Card -->
        <div style="margin: 0 28px 24px; padding: 20px; background: ${urgencyColor}08; border-left: 3px solid ${urgencyColor}80; border-radius: 0 10px 10px 0;">
          <div style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">Original Task</div>
          <p style="color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.65; margin: 0;">${taskDescription}</p>
        </div>

        <!-- CTA -->
        <div style="padding: 0 28px 32px; text-align: center;">
          <a href="${acceptLink}" style="display: inline-block; background: linear-gradient(135deg, ${urgencyColor}, ${urgencyColor}cc); color: white; padding: 14px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 20px ${urgencyColor}40;">
            Complete Task Now →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
          <p style="font-size: 11px; color: rgba(255,255,255,0.15); margin: 0;">
            Automated reminder from Uma — Digital Twin System<br/>
            Desert Dev Labs • The Utility Company
          </p>
        </div>
      </div>
    </div>
  `;

  const params = {
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: htmlBody },
        Text: { Charset: "UTF-8", Data: `REMINDER #${reminderNumber}: Work Order ${workOrderId} is still open.\n${taskDescription}\nComplete: ${acceptLink}` },
      },
      Subject: { Charset: "UTF-8", Data: `🔔 Reminder #${reminderNumber}: Uma Work Order ${workOrderId} — ${urgency}` },
    },
    Source: fromAddress,
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`SES Reminder #${reminderNumber} sent to ${toEmail}. Msg ID: ${response.MessageId}`);
    return true;
  } catch (error) {
    console.error("Error sending SES reminder:", error);
    return false;
  }
}
