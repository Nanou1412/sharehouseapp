'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// AUTH ACTIONS
// =====================================================

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create user profile in public.users
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      role: 'manager', // Default role for new signups
    });

    // Auto-grant access to all existing houses so new user sees the dashboard
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const serviceClient = await createServiceClient();
      
      const { data: allHouses } = await serviceClient
        .from('houses')
        .select('id')
        .eq('is_active', true);
      
      if (allHouses && allHouses.length > 0) {
        const accessEntries = allHouses.map((h: any) => ({
          user_id: data.user!.id,
          house_id: h.id,
          can_edit: true,
        }));
        await serviceClient
          .from('user_house_access')
          .upsert(accessEntries, { onConflict: 'user_id,house_id' });
      }
    } catch (accessError) {
      console.error('Error granting house access to new user:', accessError);
    }
  }

  return { success: true, message: 'Check your email to confirm your account' };
}

export async function signOut() {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function resetPassword(email: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: 'Check your email for a password reset link' };
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: 'Password updated successfully' };
}

export async function updateProfile(data: {
  fullName?: string;
  phone?: string;
}) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  const { error: updateAuthError } = await supabase.auth.updateUser({
    data: {
      full_name: data.fullName,
    },
  });

  if (updateAuthError) {
    return { error: updateAuthError.message };
  }

  const { error: updateProfileError } = await supabase
    .from('users')
    .update({
      full_name: data.fullName,
      phone: data.phone,
    })
    .eq('id', user.id);

  if (updateProfileError) {
    return { error: updateProfileError.message };
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: houseAccess } = await supabase
    .from('user_house_access')
    .select('house_id, can_edit')
    .eq('user_id', user.id);

  return {
    ...user,
    profile,
    houseAccess: houseAccess || [],
    isAdmin: profile?.role === 'admin',
  };
}

export async function getUserHouseAccess(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_house_access')
    .select(`
      house_id,
      can_edit,
      house:houses(id, name)
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function assignRole(
  userId: string,
  role: 'admin' | 'manager' | 'maintenance',
  houseId?: string
) {
  const supabase = await createClient();
  
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { error: 'Only admins can assign roles' };
  }

  // Update user role
  const { error: roleError } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (roleError) {
    return { error: roleError.message };
  }

  // If houseId provided, grant house access
  if (houseId) {
    const { error: accessError } = await supabase
      .from('user_house_access')
      .upsert({
        user_id: userId,
        house_id: houseId,
        can_edit: role !== 'maintenance',
      }, { onConflict: 'user_id,house_id' });

    if (accessError) {
      return { error: accessError.message };
    }
  }

  revalidatePath('/settings/users');
  return { success: true };
}

export async function removeHouseAccess(userId: string, houseId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('user_house_access')
    .delete()
    .eq('user_id', userId)
    .eq('house_id', houseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings/users');
  return { success: true };
}

// =====================================================
// TEAM MANAGEMENT
// =====================================================

export async function getTeamMembers() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Use service client to list all users (bypass RLS)
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();
  
  const { data: members, error } = await serviceClient
    .from('users')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
  
  return members || [];
}

export async function inviteMember(email: string, fullName: string, role: 'admin' | 'manager' | 'maintenance') {
  const supabase = await createClient();
  
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { error: 'Seuls les administrateurs peuvent inviter des membres' };
  }

  // Create user via service client (admin API)
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();

  // Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return { error: 'Cet email est déjà enregistré' };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Échec de la création du compte' };
  }

  // Create profile in public.users
  const { error: profileError } = await serviceClient
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      is_active: true,
    });

  if (profileError) {
    // Cleanup
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    return { error: `Erreur profil: ${profileError.message}` };
  }

  // Grant access to all existing houses
  const { data: allHouses } = await serviceClient
    .from('houses')
    .select('id')
    .eq('is_active', true);

  if (allHouses && allHouses.length > 0) {
    const accessEntries = allHouses.map((h: any) => ({
      user_id: authData.user.id,
      house_id: h.id,
      can_edit: role !== 'maintenance',
    }));
    await serviceClient
      .from('user_house_access')
      .upsert(accessEntries, { onConflict: 'user_id,house_id' });
  }

  revalidatePath('/settings');
  return { 
    success: true, 
    tempPassword,
    message: `Membre invité avec succès. Mot de passe temporaire: ${tempPassword}` 
  };
}

export async function updateMemberRole(memberId: string, role: 'admin' | 'manager' | 'maintenance') {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { error: 'Seuls les administrateurs peuvent modifier les rôles' };
  }

  // Prevent self-demotion
  if (memberId === user.id) {
    return { error: 'Vous ne pouvez pas modifier votre propre rôle' };
  }

  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from('users')
    .update({ role })
    .eq('id', memberId);

  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { success: true };
}

export async function removeMember(memberId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { error: 'Seuls les administrateurs peuvent supprimer des membres' };
  }

  if (memberId === user.id) {
    return { error: 'Vous ne pouvez pas vous supprimer vous-même' };
  }

  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();

  // Remove house access
  await serviceClient
    .from('user_house_access')
    .delete()
    .eq('user_id', memberId);

  // Remove profile
  await serviceClient
    .from('users')
    .delete()
    .eq('id', memberId);

  // Remove auth user
  await serviceClient.auth.admin.deleteUser(memberId);

  revalidatePath('/settings');
  return { success: true };
}
