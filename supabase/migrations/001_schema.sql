-- =====================================================
-- SHAREHOUSE MANAGER - DATABASE SCHEMA
-- Perth, Western Australia
-- Timezone: Australia/Perth
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'maintenance');
CREATE TYPE room_type AS ENUM ('private', 'shared');
CREATE TYPE bed_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'blacklisted');
CREATE TYPE lease_status AS ENUM ('draft', 'active', 'ending', 'ended', 'broken');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'converted');
CREATE TYPE charge_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'waived');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'cash', 'card', 'other');
CREATE TYPE arrears_status AS ENUM ('current', 'late', 'reminder_sent', 'payment_plan', 'default');
CREATE TYPE bond_status AS ENUM ('pending', 'received', 'partial', 'refunded', 'forfeited');
CREATE TYPE bill_type AS ENUM ('electricity', 'gas', 'water', 'internet', 'council_rates', 'insurance', 'other');
CREATE TYPE bill_split_mode AS ENUM ('included', 'equal_per_occupant', 'per_bed', 'prorata_days', 'flat_weekly_per_person');
CREATE TYPE bill_status AS ENUM ('pending', 'allocated', 'paid');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_parts', 'completed', 'cancelled');
CREATE TYPE ticket_responsibility AS ENUM ('landlord', 'tenant', 'shared');
CREATE TYPE checklist_type AS ENUM ('move_in', 'move_out');
CREATE TYPE checklist_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE item_condition AS ENUM ('new', 'good', 'fair', 'poor', 'damaged', 'missing');
CREATE TYPE key_status AS ENUM ('available', 'issued', 'lost', 'replaced');
CREATE TYPE warning_severity AS ENUM ('verbal', 'written', 'final');
CREATE TYPE candidate_status AS ENUM ('new', 'screening', 'approved', 'rejected', 'waitlist');
CREATE TYPE alert_type AS ENUM ('occupancy', 'arrears', 'maintenance', 'bills', 'lease_expiry', 'vacancy');
CREATE TYPE alert_priority AS ENUM ('info', 'warning', 'critical');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');
CREATE TYPE expense_category AS ENUM ('maintenance', 'utilities', 'supplies', 'insurance', 'council', 'mortgage', 'management', 'other');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'manager',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-House access (for multi-house management)
CREATE TABLE user_house_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    house_id UUID NOT NULL, -- FK added after houses table
    can_edit BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, house_id)
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =====================================================
-- PROPERTY TABLES
-- =====================================================

-- Houses
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    suburb TEXT NOT NULL,
    postcode TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'WA',
    country TEXT NOT NULL DEFAULT 'Australia',
    property_manager TEXT,
    owner_name TEXT,
    owner_contact TEXT,
    total_bedrooms INTEGER NOT NULL DEFAULT 0,
    total_beds INTEGER NOT NULL DEFAULT 0,
    default_bond_weeks INTEGER NOT NULL DEFAULT 4,
    default_bill_split_mode bill_split_mode NOT NULL DEFAULT 'equal_per_occupant',
    prorate_move_in BOOLEAN NOT NULL DEFAULT false, -- OFF by default
    prorate_move_out BOOLEAN NOT NULL DEFAULT true, -- ON by default
    wifi_ssid TEXT,
    wifi_password TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK to user_house_access
ALTER TABLE user_house_access 
ADD CONSTRAINT fk_user_house_access_house 
FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE;

CREATE INDEX idx_houses_active ON houses(is_active);

-- Rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    room_type room_type NOT NULL,
    floor INTEGER DEFAULT 0,
    has_ensuite BOOLEAN NOT NULL DEFAULT false,
    has_balcony BOOLEAN NOT NULL DEFAULT false,
    has_ac BOOLEAN NOT NULL DEFAULT false,
    size_sqm DECIMAL(6,2),
    weekly_rent DECIMAL(10,2), -- For private rooms
    bond_amount DECIMAL(10,2), -- Override house default
    couple_allowed BOOLEAN NOT NULL DEFAULT false,
    couple_surcharge DECIMAL(10,2) DEFAULT 0,
    max_occupants INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_max_occupants CHECK (max_occupants >= 1)
);

CREATE INDEX idx_rooms_house ON rooms(house_id);
CREATE INDEX idx_rooms_type ON rooms(room_type);

-- Beds (for shared rooms)
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number INTEGER NOT NULL,
    bed_type TEXT DEFAULT 'single', -- single, double, bunk_top, bunk_bottom
    weekly_rent DECIMAL(10,2) NOT NULL,
    bond_amount DECIMAL(10,2),
    status bed_status NOT NULL DEFAULT 'available',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, bed_number)
);

CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_beds_status ON beds(status);

-- =====================================================
-- TENANT TABLES
-- =====================================================

-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    date_of_birth DATE,
    nationality TEXT,
    visa_type TEXT,
    visa_expiry DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    employer TEXT,
    occupation TEXT,
    weekly_income DECIMAL(10,2),
    previous_address TEXT,
    previous_landlord_contact TEXT,
    id_type TEXT, -- passport, driver_license, etc
    id_number TEXT,
    id_expiry DATE,
    status tenant_status NOT NULL DEFAULT 'active',
    risk_score INTEGER DEFAULT 50, -- 0-100, higher = riskier
    risk_notes TEXT,
    is_blacklisted BOOLEAN NOT NULL DEFAULT false,
    blacklist_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_blacklisted ON tenants(is_blacklisted);

-- Tenant Documents
CREATE TABLE tenant_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- id, visa, payslip, reference, contract, other
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase storage path
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_documents_tenant ON tenant_documents(tenant_id);

-- =====================================================
-- RESERVATION & LEASE TABLES
-- =====================================================

-- Reservations (pre-lease bookings)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = open-ended
    weekly_rent DECIMAL(10,2) NOT NULL,
    bond_amount DECIMAL(10,2) NOT NULL,
    status reservation_status NOT NULL DEFAULT 'pending',
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_reservation_target CHECK (room_id IS NOT NULL OR bed_id IS NOT NULL)
);

CREATE INDEX idx_reservations_house ON reservations(house_id);
CREATE INDEX idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_dates ON reservations(start_date, end_date);

-- Leases
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = periodic/open-ended
    notice_period_weeks INTEGER DEFAULT 2,
    weekly_rent DECIMAL(10,2) NOT NULL,
    bond_amount DECIMAL(10,2) NOT NULL,
    status lease_status NOT NULL DEFAULT 'draft',
    is_couple BOOLEAN NOT NULL DEFAULT false,
    move_in_completed BOOLEAN NOT NULL DEFAULT false,
    move_out_completed BOOLEAN NOT NULL DEFAULT false,
    termination_date DATE,
    termination_reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_lease_target CHECK (room_id IS NOT NULL OR bed_id IS NOT NULL)
);

CREATE INDEX idx_leases_house ON leases(house_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_dates ON leases(start_date, end_date);

-- Lease Participants (supports couples with split)
CREATE TABLE lease_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rent_share_percent DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    moved_in_at DATE,
    moved_out_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_share CHECK (rent_share_percent > 0 AND rent_share_percent <= 100),
    UNIQUE(lease_id, tenant_id)
);

CREATE INDEX idx_lease_participants_lease ON lease_participants(lease_id);
CREATE INDEX idx_lease_participants_tenant ON lease_participants(tenant_id);

-- =====================================================
-- FINANCIAL TABLES
-- =====================================================

-- Rent Charges (weekly)
CREATE TABLE rent_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    lease_participant_id UUID REFERENCES lease_participants(id) ON DELETE SET NULL,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Monday
    week_end DATE NOT NULL, -- Sunday
    days_charged INTEGER NOT NULL DEFAULT 7,
    base_amount DECIMAL(10,2) NOT NULL,
    prorata_amount DECIMAL(10,2) NOT NULL, -- Actual charge after prorata
    credit_applied DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    status charge_status NOT NULL DEFAULT 'pending',
    due_date DATE NOT NULL,
    is_prorated BOOLEAN NOT NULL DEFAULT false,
    prorate_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lease_id, week_start)
);

CREATE INDEX idx_rent_charges_lease ON rent_charges(lease_id);
CREATE INDEX idx_rent_charges_house ON rent_charges(house_id);
CREATE INDEX idx_rent_charges_week ON rent_charges(week_start);
CREATE INDEX idx_rent_charges_status ON rent_charges(status);
CREATE INDEX idx_rent_charges_due ON rent_charges(due_date);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    rent_charge_id UUID REFERENCES rent_charges(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_date DATE NOT NULL,
    reference TEXT,
    is_advance_payment BOOLEAN NOT NULL DEFAULT false, -- Credit for future
    is_partial BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_house ON payments(house_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_lease ON payments(lease_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Payment Promises (for arrears workflow)
CREATE TABLE payment_promises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    promised_amount DECIMAL(10,2) NOT NULL,
    promised_date DATE NOT NULL,
    actual_amount DECIMAL(10,2),
    actual_date DATE,
    is_fulfilled BOOLEAN NOT NULL DEFAULT false,
    is_broken BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_promises_tenant ON payment_promises(tenant_id);
CREATE INDEX idx_payment_promises_lease ON payment_promises(lease_id);

-- Tenant Arrears Tracking
CREATE TABLE tenant_arrears (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    total_arrears DECIMAL(10,2) NOT NULL DEFAULT 0,
    weeks_behind INTEGER NOT NULL DEFAULT 0,
    status arrears_status NOT NULL DEFAULT 'current',
    last_reminder_sent TIMESTAMPTZ,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    payment_plan_active BOOLEAN NOT NULL DEFAULT false,
    payment_plan_amount DECIMAL(10,2),
    payment_plan_frequency TEXT, -- weekly, fortnightly
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lease_id)
);

CREATE INDEX idx_tenant_arrears_tenant ON tenant_arrears(tenant_id);
CREATE INDEX idx_tenant_arrears_status ON tenant_arrears(status);

-- Bonds
CREATE TABLE bonds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    expected_amount DECIMAL(10,2) NOT NULL,
    received_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    received_date DATE,
    lodged_with TEXT, -- bond_authority, held_by_landlord
    lodgement_reference TEXT,
    status bond_status NOT NULL DEFAULT 'pending',
    refund_amount DECIMAL(10,2),
    refund_date DATE,
    deductions JSONB DEFAULT '[]', -- [{reason: string, amount: number}]
    total_deductions DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bonds_lease ON bonds(lease_id);
CREATE INDEX idx_bonds_tenant ON bonds(tenant_id);
CREATE INDEX idx_bonds_house ON bonds(house_id);
CREATE INDEX idx_bonds_status ON bonds(status);

-- =====================================================
-- BILLS & EXPENSES
-- =====================================================

-- Bills
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    bill_type bill_type NOT NULL,
    provider TEXT,
    account_number TEXT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    split_mode bill_split_mode NOT NULL,
    status bill_status NOT NULL DEFAULT 'pending',
    paid_date DATE,
    file_path TEXT, -- Invoice scan
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_house ON bills(house_id);
CREATE INDEX idx_bills_type ON bills(bill_type);
CREATE INDEX idx_bills_period ON bills(period_start, period_end);
CREATE INDEX idx_bills_status ON bills(status);

-- Bill Allocations (per tenant)
CREATE TABLE bill_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    days_in_period INTEGER NOT NULL,
    occupant_count INTEGER NOT NULL DEFAULT 1, -- For per_bed calculations
    allocated_amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bill_allocations_bill ON bill_allocations(bill_id);
CREATE INDEX idx_bill_allocations_tenant ON bill_allocations(tenant_id);

-- Expenses (non-bill costs)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_period TEXT, -- weekly, monthly, quarterly, yearly
    vendor TEXT,
    receipt_path TEXT,
    maintenance_ticket_id UUID, -- FK added after maintenance table
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_house ON expenses(house_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- =====================================================
-- MAINTENANCE
-- =====================================================

-- Maintenance Tickets
CREATE TABLE maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    reported_by_tenant UUID REFERENCES tenants(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    responsibility ticket_responsibility NOT NULL DEFAULT 'landlord',
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    scheduled_date DATE,
    completed_date DATE,
    contractor_name TEXT,
    contractor_contact TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_tickets_house ON maintenance_tickets(house_id);
CREATE INDEX idx_maintenance_tickets_status ON maintenance_tickets(status);
CREATE INDEX idx_maintenance_tickets_priority ON maintenance_tickets(priority);
CREATE INDEX idx_maintenance_tickets_assigned ON maintenance_tickets(assigned_to);

-- Add FK to expenses
ALTER TABLE expenses 
ADD CONSTRAINT fk_expenses_maintenance 
FOREIGN KEY (maintenance_ticket_id) REFERENCES maintenance_tickets(id) ON DELETE SET NULL;

-- Maintenance Photos
CREATE TABLE maintenance_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    description TEXT,
    photo_type TEXT NOT NULL DEFAULT 'issue', -- issue, progress, completed
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_photos_ticket ON maintenance_photos(ticket_id);

-- =====================================================
-- CHECKLISTS & INVENTORY
-- =====================================================

-- Checklists (move-in/move-out)
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    checklist_type checklist_type NOT NULL,
    status checklist_status NOT NULL DEFAULT 'pending',
    scheduled_date DATE,
    completed_date DATE,
    completed_by UUID REFERENCES users(id),
    tenant_signature TEXT, -- Base64 or file path
    staff_signature TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_lease ON checklists(lease_id);
CREATE INDEX idx_checklists_type ON checklists(checklist_type);
CREATE INDEX idx_checklists_status ON checklists(status);

-- Checklist Items
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    location TEXT, -- room area
    condition item_condition NOT NULL,
    condition_notes TEXT,
    photo_path TEXT,
    requires_action BOOLEAN NOT NULL DEFAULT false,
    action_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);

-- Inventory Items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    category TEXT, -- furniture, appliance, kitchenware, etc
    quantity INTEGER NOT NULL DEFAULT 1,
    condition item_condition NOT NULL DEFAULT 'good',
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    current_value DECIMAL(10,2),
    warranty_expiry DATE,
    serial_number TEXT,
    photo_path TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_house ON inventory_items(house_id);
CREATE INDEX idx_inventory_items_room ON inventory_items(room_id);

-- =====================================================
-- CLEANING & HOUSE RULES
-- =====================================================

-- Cleaning Roster
CREATE TABLE cleaning_roster (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Monday
    areas TEXT[] NOT NULL, -- ['kitchen', 'bathroom_1', 'common_area']
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cleaning_roster_house ON cleaning_roster(house_id);
CREATE INDEX idx_cleaning_roster_tenant ON cleaning_roster(tenant_id);
CREATE INDEX idx_cleaning_roster_week ON cleaning_roster(week_start);

-- House Rules (versioned)
CREATE TABLE house_rules_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    rules_content TEXT NOT NULL, -- Markdown or JSON
    effective_from DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(house_id, version)
);

CREATE INDEX idx_house_rules_house ON house_rules_versions(house_id);

-- Warnings (strike system)
CREATE TABLE warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    severity warning_severity NOT NULL,
    rule_violated TEXT NOT NULL,
    description TEXT NOT NULL,
    incident_date DATE NOT NULL,
    strike_number INTEGER NOT NULL DEFAULT 1,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    issued_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warnings_tenant ON warnings(tenant_id);
CREATE INDEX idx_warnings_house ON warnings(house_id);

-- =====================================================
-- KEYS
-- =====================================================

-- Keys
CREATE TABLE keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    key_type TEXT NOT NULL, -- front_door, room, mailbox, garage, etc
    key_number TEXT NOT NULL,
    status key_status NOT NULL DEFAULT 'available',
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    issued_to_tenant UUID REFERENCES tenants(id) ON DELETE SET NULL,
    issued_date DATE,
    returned_date DATE,
    replacement_cost DECIMAL(10,2) DEFAULT 50.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_keys_house ON keys(house_id);
CREATE INDEX idx_keys_status ON keys(status);
CREATE INDEX idx_keys_tenant ON keys(issued_to_tenant);

-- =====================================================
-- CANDIDATES (PUBLIC PORTAL)
-- =====================================================

-- Candidates
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES houses(id) ON DELETE SET NULL, -- Preferred house
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL, -- Preferred room
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL, -- Preferred bed
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    preferred_move_in DATE,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    occupation TEXT,
    employer TEXT,
    visa_status TEXT,
    current_situation TEXT, -- moving from, reason
    about_me TEXT,
    status candidate_status NOT NULL DEFAULT 'new',
    screening_score INTEGER,
    screening_notes TEXT,
    converted_to_tenant UUID REFERENCES tenants(id),
    converted_at TIMESTAMPTZ,
    source TEXT, -- website, referral, gumtree, etc
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_house ON candidates(house_id);

-- =====================================================
-- ALERTS
-- =====================================================

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    alert_type alert_type NOT NULL,
    priority alert_priority NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT, -- lease, tenant, bill, ticket, etc
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_by UUID REFERENCES users(id),
    dismissed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_house ON alerts(house_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- =====================================================
-- VIEWS
-- =====================================================

-- Current Occupancy View
CREATE OR REPLACE VIEW current_occupancy AS
SELECT 
    h.id as house_id,
    h.name as house_name,
    r.id as room_id,
    r.name as room_name,
    r.room_type,
    b.id as bed_id,
    b.bed_number,
    CASE 
        WHEN r.room_type = 'private' THEN r.weekly_rent
        ELSE b.weekly_rent
    END as weekly_rent,
    l.id as lease_id,
    l.status as lease_status,
    t.id as tenant_id,
    t.first_name || ' ' || t.last_name as tenant_name,
    l.start_date,
    l.end_date,
    l.is_couple
FROM houses h
LEFT JOIN rooms r ON r.house_id = h.id AND r.is_active
LEFT JOIN beds b ON b.room_id = r.id AND b.is_active
LEFT JOIN leases l ON (l.room_id = r.id OR l.bed_id = b.id) 
    AND l.status IN ('active', 'ending')
LEFT JOIN lease_participants lp ON lp.lease_id = l.id AND lp.is_primary
LEFT JOIN tenants t ON t.id = lp.tenant_id
WHERE h.is_active;

-- Arrears Summary View
CREATE OR REPLACE VIEW arrears_summary AS
SELECT 
    l.id as lease_id,
    l.house_id,
    h.name as house_name,
    t.id as tenant_id,
    t.first_name || ' ' || t.last_name as tenant_name,
    t.email,
    t.phone,
    SUM(CASE WHEN rc.status IN ('pending', 'partial', 'overdue') 
        THEN rc.amount_due - rc.amount_paid ELSE 0 END) as total_arrears,
    COUNT(CASE WHEN rc.status = 'overdue' THEN 1 END) as overdue_weeks,
    MIN(CASE WHEN rc.status IN ('pending', 'partial', 'overdue') 
        THEN rc.week_start END) as oldest_unpaid_week,
    ta.status as arrears_status
FROM leases l
JOIN houses h ON h.id = l.house_id
JOIN lease_participants lp ON lp.lease_id = l.id AND lp.is_primary
JOIN tenants t ON t.id = lp.tenant_id
LEFT JOIN rent_charges rc ON rc.lease_id = l.id
LEFT JOIN tenant_arrears ta ON ta.lease_id = l.id
WHERE l.status IN ('active', 'ending')
GROUP BY l.id, l.house_id, h.name, t.id, t.first_name, t.last_name, 
         t.email, t.phone, ta.status;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at()
        ', t, t);
    END LOOP;
END;
$$;

-- Calculate prorated rent
CREATE OR REPLACE FUNCTION calculate_prorated_rent(
    weekly_rent DECIMAL,
    days_occupied INTEGER
) RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND((weekly_rent / 7) * days_occupied, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get week start (Monday) for a date
CREATE OR REPLACE FUNCTION get_week_start(d DATE) 
RETURNS DATE AS $$
BEGIN
    RETURN d - EXTRACT(DOW FROM d)::INTEGER + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Try to get current user from session
    BEGIN
        current_user_id := (current_setting('app.current_user_id', true))::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data)
        VALUES (current_user_id, TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_user_id, TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, table_name, record_id, action, old_data)
        VALUES (current_user_id, TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to main tables
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'houses', 'rooms', 'beds', 'tenants', 'leases', 'lease_participants',
        'rent_charges', 'payments', 'bonds', 'bills', 'maintenance_tickets',
        'warnings', 'keys', 'inventory_items', 'candidates'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER audit_%I
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION audit_trigger_function()
        ', t, t);
    END LOOP;
END;
$$;

-- Update house totals function
CREATE OR REPLACE FUNCTION update_house_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total bedrooms
    UPDATE houses h
    SET total_bedrooms = (
        SELECT COUNT(*) FROM rooms r WHERE r.house_id = h.id AND r.is_active
    ),
    total_beds = (
        SELECT COUNT(*) FROM beds b 
        JOIN rooms r ON r.id = b.room_id 
        WHERE r.house_id = h.id AND b.is_active
    )
    WHERE h.id = COALESCE(NEW.house_id, OLD.house_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_house_totals_rooms
AFTER INSERT OR UPDATE OR DELETE ON rooms
FOR EACH ROW EXECUTE FUNCTION update_house_totals();

CREATE TRIGGER update_house_totals_beds
AFTER INSERT OR UPDATE OR DELETE ON beds
FOR EACH ROW EXECUTE FUNCTION update_house_totals();
