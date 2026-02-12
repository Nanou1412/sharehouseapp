import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServiceClient();

    // Check if any users exist in the users table
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Table might not exist yet - that's ok, setup is needed
      return NextResponse.json({ needsSetup: true, reason: 'no_tables' });
    }

    return NextResponse.json({
      needsSetup: (count ?? 0) === 0,
      reason: (count ?? 0) === 0 ? 'no_users' : null,
    });
  } catch (error) {
    return NextResponse.json({ needsSetup: true, reason: 'error' });
  }
}
