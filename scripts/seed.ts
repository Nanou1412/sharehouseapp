/**
 * Database Seed Script
 * 
 * This script creates sample data for development and testing.
 * Run with: npm run db:seed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Create sample houses
    console.log('Creating houses...');
    const { data: houses, error: housesError } = await supabase
      .from('houses')
      .insert([
        {
          address: '123 Perth Street',
          suburb: 'Northbridge',
          postcode: '6003',
          default_weekly_rent: 200,
          default_bond_weeks: 4,
          utilities_included: true,
          is_active: true,
        },
        {
          address: '456 Murray Avenue',
          suburb: 'Subiaco',
          postcode: '6008',
          default_weekly_rent: 220,
          default_bond_weeks: 4,
          utilities_included: false,
          is_active: true,
        },
        {
          address: '789 Beach Road',
          suburb: 'Fremantle',
          postcode: '6160',
          default_weekly_rent: 180,
          default_bond_weeks: 4,
          utilities_included: true,
          is_active: true,
        },
      ])
      .select();

    if (housesError) throw housesError;
    console.log(`✅ Created ${houses?.length} houses\n`);

    // Create rooms for each house
    console.log('Creating rooms...');
    const roomsToCreate = [];
    
    for (const house of houses || []) {
      roomsToCreate.push(
        {
          house_id: house.id,
          name: 'Room 1',
          room_type: 'single',
          floor_level: 0,
          weekly_rent: house.default_weekly_rent,
          is_active: true,
        },
        {
          house_id: house.id,
          name: 'Room 2',
          room_type: 'double',
          floor_level: 0,
          weekly_rent: house.default_weekly_rent + 30,
          is_active: true,
        },
        {
          house_id: house.id,
          name: 'Room 3',
          room_type: 'shared',
          floor_level: 1,
          weekly_rent: house.default_weekly_rent - 20,
          is_active: true,
        }
      );
    }

    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .insert(roomsToCreate)
      .select();

    if (roomsError) throw roomsError;
    console.log(`✅ Created ${rooms?.length} rooms\n`);

    // Create beds for each room
    console.log('Creating beds...');
    const bedsToCreate = [];
    
    for (const room of rooms || []) {
      const bedCount = room.room_type === 'shared' ? 2 : 1;
      for (let i = 0; i < bedCount; i++) {
        bedsToCreate.push({
          room_id: room.id,
          label: `Bed ${String.fromCharCode(65 + i)}`,
          bed_type: room.room_type === 'double' ? 'double' : 'single',
          weekly_rent: room.weekly_rent / bedCount,
          bond_amount: (room.weekly_rent / bedCount) * 4,
          status: 'available',
          is_occupied: false,
        });
      }
    }

    const { data: beds, error: bedsError } = await supabase
      .from('beds')
      .insert(bedsToCreate)
      .select();

    if (bedsError) throw bedsError;
    console.log(`✅ Created ${beds?.length} beds\n`);

    // Create sample tenants
    console.log('Creating tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .insert([
        {
          first_name: 'James',
          last_name: 'Wilson',
          email: 'james.wilson@example.com',
          phone: '0412 345 678',
          date_of_birth: '1995-03-15',
          nationality: 'Australian',
          visa_type: 'citizen',
          status: 'active',
          current_balance: 0,
          emergency_contact: {
            name: 'Sarah Wilson',
            relationship: 'Sister',
            phone: '0423 456 789',
          },
        },
        {
          first_name: 'Maria',
          last_name: 'Garcia',
          email: 'maria.garcia@example.com',
          phone: '0413 456 789',
          date_of_birth: '1998-07-22',
          nationality: 'Spanish',
          visa_type: 'working_holiday',
          visa_expiry: '2025-07-22',
          status: 'active',
          current_balance: 0,
        },
        {
          first_name: 'Yuki',
          last_name: 'Tanaka',
          email: 'yuki.tanaka@example.com',
          phone: '0414 567 890',
          date_of_birth: '2000-01-10',
          nationality: 'Japanese',
          visa_type: 'student',
          visa_expiry: '2026-03-15',
          status: 'active',
          current_balance: -150,
        },
        {
          first_name: 'David',
          last_name: 'Chen',
          email: 'david.chen@example.com',
          phone: '0415 678 901',
          date_of_birth: '1997-11-05',
          nationality: 'Chinese',
          visa_type: 'work',
          status: 'prospect',
          current_balance: 0,
        },
      ])
      .select();

    if (tenantsError) throw tenantsError;
    console.log(`✅ Created ${tenants?.length} tenants\n`);

    // Create leases for active tenants
    console.log('Creating leases...');
    const activeTenants = tenants?.filter(t => t.status === 'active') || [];
    const availableBeds = beds?.slice(0, activeTenants.length) || [];
    
    const leasesToCreate = activeTenants.map((tenant, i) => ({
      tenant_id: tenant.id,
      bed_id: availableBeds[i].id,
      start_date: '2024-01-08', // A Monday
      weekly_rent: availableBeds[i].weekly_rent,
      bond_amount: availableBeds[i].bond_amount,
      payment_day: 'monday',
      status: 'active',
    }));

    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .insert(leasesToCreate)
      .select();

    if (leasesError) throw leasesError;
    console.log(`✅ Created ${leases?.length} leases\n`);

    // Update beds as occupied
    for (let i = 0; i < activeTenants.length; i++) {
      await supabase
        .from('beds')
        .update({ is_occupied: true, status: 'occupied' })
        .eq('id', availableBeds[i].id);
    }
    console.log('✅ Updated bed occupancy\n');

    // Create sample payments
    console.log('Creating payments...');
    const paymentsToCreate = activeTenants.map((tenant, i) => ({
      tenant_id: tenant.id,
      amount: availableBeds[i].weekly_rent * 4 + availableBeds[i].bond_amount,
      payment_date: '2024-01-08',
      payment_type: 'rent',
      method: 'bank_transfer',
      reference: `PAY-${Math.random().toString(36).substring(7).toUpperCase()}`,
      is_reconciled: true,
    }));

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert(paymentsToCreate)
      .select();

    if (paymentsError) throw paymentsError;
    console.log(`✅ Created ${payments?.length} payments\n`);

    // Create maintenance tickets
    console.log('Creating maintenance tickets...');
    const { data: tickets, error: ticketsError } = await supabase
      .from('maintenance_tickets')
      .insert([
        {
          house_id: houses?.[0].id,
          title: 'Leaking tap in bathroom',
          description: 'The hot water tap in the main bathroom is dripping constantly.',
          category: 'plumbing',
          priority: 'medium',
          status: 'open',
        },
        {
          house_id: houses?.[1].id,
          title: 'Air conditioning not working',
          description: 'The AC unit in Room 2 is not cooling properly.',
          category: 'appliance',
          priority: 'high',
          status: 'in_progress',
        },
        {
          house_id: houses?.[2].id,
          room_id: rooms?.find(r => r.house_id === houses?.[2].id)?.id,
          title: 'Light bulb replacement',
          description: 'Ceiling light bulb needs replacing in Room 1.',
          category: 'electrical',
          priority: 'low',
          status: 'completed',
          resolved_at: new Date().toISOString(),
        },
      ])
      .select();

    if (ticketsError) throw ticketsError;
    console.log(`✅ Created ${tickets?.length} maintenance tickets\n`);

    // Create bills
    console.log('Creating bills...');
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .insert([
        {
          house_id: houses?.[0].id,
          bill_category: 'electricity',
          total_amount: 245.50,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          due_date: '2024-02-14',
          split_mode: 'equal',
          status: 'paid',
          provider_name: 'Synergy',
        },
        {
          house_id: houses?.[1].id,
          bill_category: 'water',
          total_amount: 89.20,
          period_start: '2024-01-01',
          period_end: '2024-03-31',
          due_date: '2024-04-15',
          split_mode: 'equal',
          status: 'pending',
          provider_name: 'Water Corporation',
        },
        {
          house_id: houses?.[0].id,
          bill_category: 'internet',
          total_amount: 79.00,
          period_start: '2024-02-01',
          period_end: '2024-02-28',
          due_date: '2024-02-28',
          split_mode: 'equal',
          status: 'pending',
          provider_name: 'ABB',
        },
      ])
      .select();

    if (billsError) throw billsError;
    console.log(`✅ Created ${bills?.length} bills\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`  - ${houses?.length} houses`);
    console.log(`  - ${rooms?.length} rooms`);
    console.log(`  - ${beds?.length} beds`);
    console.log(`  - ${tenants?.length} tenants`);
    console.log(`  - ${leases?.length} leases`);
    console.log(`  - ${payments?.length} payments`);
    console.log(`  - ${tickets?.length} maintenance tickets`);
    console.log(`  - ${bills?.length} bills`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
