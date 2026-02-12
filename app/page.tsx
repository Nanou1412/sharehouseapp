import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

export default async function HomePage() {
  try {
    const supabase = await createServiceClient();
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (count === null || count === 0) {
      redirect('/setup');
    }
  } catch {
    // If tables don't exist yet, redirect to setup
    redirect('/setup');
  }

  redirect('/dashboard');
}
