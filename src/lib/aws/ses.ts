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
  taskDescription: string
) {
  const fromAddress = process.env.SES_FROM_ADDRESS || 'founders@theutilitycompany.co';

  // In a real production system, this URL would be dynamic based on the host. 
  // We'll mock it for local dev.
  const acceptLink = `http://localhost:3000/worker?order=${workOrderId}`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #6366f1;">Work Order Request #${workOrderId}</h2>
      <p>Hello <strong>${workerName}</strong>,</p>
      <p>Uma has detected a critical anomaly in the climate array and requires your manual intervention.</p>
      
      <div style="background: #f8fafc; padding: 16px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <h3 style="margin-top:0;">Task Details</h3>
        <p style="font-size: 16px;">${taskDescription}</p>
      </div>

      <p>Please log into the facility worker terminal or tap the button below to accept and mark this task as completed once finished.</p>
      
      <a href="${acceptLink}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
        Open Worker Terminal
      </a>

      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">
        This is an automated dispatch from Uma - Digital Twin System.<br/>
        Desert Dev Labs Simulation
      </p>
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
