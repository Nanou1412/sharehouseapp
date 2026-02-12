import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyRentCharges } from '@/lib/rent-engine';
import { runAllAlertChecks } from '@/lib/services/alert-service';
import { generateRosterForAllHouses } from '@/lib/services/cleaning-service';
import { getMondayOfWeek, nowInPerth, formatDate } from '@/lib/utils';

// This route should be called by a cron job every Monday at 00:01 Perth time
// It generates weekly rent charges for all active leases

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const weekStartDate = getMondayOfWeek(nowInPerth());
    const weekStart = formatDate(weekStartDate, 'yyyy-MM-dd');
    
    // Generate weekly rent charges (pass Date, not string)
    const rentCharges = await generateWeeklyRentCharges(weekStartDate);
    
    // Generate cleaning roster
    const rosters = await generateRosterForAllHouses(weekStart);
    
    // Run alert checks
    const alerts = await runAllAlertChecks();

    return NextResponse.json({
      success: true,
      weekStart,
      results: {
        rentChargesCreated: rentCharges.created,
        rentChargesSkipped: rentCharges.skipped,
        rostersGenerated: rosters.length,
        alertsGenerated: alerts.totalGenerated,
      },
    });
  } catch (error) {
    console.error('Weekly cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run weekly tasks' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
