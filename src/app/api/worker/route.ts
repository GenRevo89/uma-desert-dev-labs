import { NextResponse } from 'next/server';

// In-memory queue of completed orders pending sync to the frontend simulation
const globalForWorker = global as unknown as { completedOrders: string[] };
if (!globalForWorker.completedOrders) {
  globalForWorker.completedOrders = [];
}

export async function GET() {
  const pendingToClear = [...globalForWorker.completedOrders];
  globalForWorker.completedOrders = [];
  return NextResponse.json({ completedOrders: pendingToClear });
}

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (orderId && !globalForWorker.completedOrders.includes(orderId)) {
      globalForWorker.completedOrders.push(orderId);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to complete order' }, { status: 400 });
  }
}
