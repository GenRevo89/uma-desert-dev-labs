import { NextRequest, NextResponse } from 'next/server';

/**
 * Uma Work Order CRON Check
 * Called periodically by the frontend interval to:
 * 1. Check open work orders for overdue reminders
 * 2. Check completed-but-unreviewed orders for Uma to assess
 */
export async function POST(req: NextRequest) {
  try {
    const { reminderMinutes, baseUrl } = await req.json();
    const origin = baseUrl || new URL(req.url).origin;
    const gqlUrl = `${origin}/api/graphql`;

    const results: any = {
      reminders: [],
      reviews: [],
      escalations: [],
    };

    // ── 1. Check open work orders for overdue reminders ──
    const openRes = await fetch(gqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { getOpenWorkOrders { workOrderId type description assignedTo assignedEmail towerId createdAt lastReminderSentAt reminderCount } }`
      }),
    });
    const openData = await openRes.json();
    const openOrders = openData?.data?.getOpenWorkOrders || [];

    const now = Date.now();
    const reminderThresholdMs = (reminderMinutes || 30) * 60 * 1000;

    for (const wo of openOrders) {
      const lastContact = wo.lastReminderSentAt ? new Date(wo.lastReminderSentAt).getTime() : new Date(wo.createdAt).getTime();
      const elapsed = now - lastContact;

      if (elapsed >= reminderThresholdMs && wo.assignedEmail) {
        // Send reminder email
        try {
          const { sendWorkOrderReminder } = await import('@/lib/aws/ses');
          await sendWorkOrderReminder(
            wo.assignedEmail,
            wo.assignedTo || 'Team Member',
            wo.workOrderId,
            wo.description,
            wo.reminderCount + 1,
            origin,
          );

          // Update reminder timestamp
          await fetch(gqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `mutation { updateReminderSent(workOrderId: "${wo.workOrderId}") { workOrderId reminderCount } }`
            }),
          });

          results.reminders.push({ workOrderId: wo.workOrderId, reminderNumber: wo.reminderCount + 1 });
          console.log(`Uma CRON: Reminder #${wo.reminderCount + 1} sent for ${wo.workOrderId} to ${wo.assignedEmail}`);
        } catch (e: any) {
          console.error(`Uma CRON: Failed to send reminder for ${wo.workOrderId}:`, e.message);
        }
      }
    }

    // ── 2. Check completed-but-unreviewed orders for Uma assessment ──
    const completedRes = await fetch(gqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { 
          getCompletedUnreviewedOrders { workOrderId type description assignedTo towerId workerNotes resolution timeSpent } 
          getTeamWorkers { name email role }
        }`
      }),
    });
    const completedData = await completedRes.json();
    const completedOrders = completedData?.data?.getCompletedUnreviewedOrders || [];
    const teamWorkers = completedData?.data?.getTeamWorkers || [];

    for (const wo of completedOrders) {
      try {
        // Ask Uma to review the completion via the chat API
        const reviewPrompt = `[WORK ORDER REVIEW] Work Order ${wo.workOrderId} for "${wo.type}" on tower ${wo.towerId || 'unknown'} has been marked complete by the field technician.

Worker Report:
- Resolution: ${wo.resolution || 'not specified'}
- Time Spent: ${wo.timeSpent ? wo.timeSpent + ' minutes' : 'not recorded'}
- Notes: ${wo.workerNotes || 'No notes provided'}
- Original Task: ${wo.description}

Review this completion report. If the issue appears genuinely resolved, use the review_work_order tool with status "verified" and then use the restore_crop_health tool for tower ${wo.towerId || 'T1'}. 

If the worker's response is insufficient or the issue needs further attention, use review_work_order with status "escalated". You MUST also use the issue_work_order tool to send a follow-up intervention to a 'Manager' from the team list, explaining the failure and what needs to be done.`;

        const chatRes = await fetch(`${origin}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: reviewPrompt }],
            farmSchema: { teamWorkers },
          }),
        });

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          const reviewText = chatData.choices?.[0]?.message?.content || '';
          results.reviews.push({ workOrderId: wo.workOrderId, review: reviewText.slice(0, 200) });
          console.log(`Uma CRON: Reviewed ${wo.workOrderId} — ${reviewText.slice(0, 100)}`);
        }
      } catch (e: any) {
        console.error(`Uma CRON: Failed to review ${wo.workOrderId}:`, e.message);
      }
    }

    return NextResponse.json({
      success: true,
      checked: { open: openOrders.length, completedUnreviewed: completedOrders.length },
      results,
    });
  } catch (e: any) {
    console.error('Uma CRON Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
