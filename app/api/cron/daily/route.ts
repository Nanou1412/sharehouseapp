import { NextRequest, NextResponse } from 'next/server';
import { runAllAlertChecks, deleteOldAlerts } from '@/lib/services/alert-service';

// This route should be called by a cron job daily at 08:00 Perth time
// It generates alerts for arrears, expiring leases, documents, etc.

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run all alert checks
    const alerts = await runAllAlertChecks();
    
    // Clean up old read alerts (older than 30 days)
    await deleteOldAlerts(30);

    return NextResponse.json({
      success: true,
      alertsGenerated: {
        arrears: alerts.arrears.length,
        leaseExpiry: alerts.leaseExpiry.length,
        maintenance: alerts.maintenance.length,
        documentExpiry: alerts.documentExpiry.length,
        vacancy: alerts.vacancy.length,
        total: alerts.totalGenerated,
      },
    });
  } catch (error) {
    console.error('Daily cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run daily tasks' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
