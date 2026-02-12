-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- Sharehouse Manager
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_house_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_rules_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has access to a house
CREATE OR REPLACE FUNCTION has_house_access(house_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins have access to all houses
    IF is_admin() THEN
        RETURN true;
    END IF;
    
    -- Check user_house_access
    RETURN EXISTS (
        SELECT 1 FROM user_house_access uha
        JOIN users u ON u.id = uha.user_id
        WHERE uha.user_id = auth.uid()
        AND uha.house_id = house_uuid
        AND u.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can edit a house
CREATE OR REPLACE FUNCTION can_edit_house(house_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins can edit all houses
    IF is_admin() THEN
        RETURN true;
    END IF;
    
    -- Check user_house_access with edit permission
    RETURN EXISTS (
        SELECT 1 FROM user_house_access uha
        JOIN users u ON u.id = uha.user_id
        WHERE uha.user_id = auth.uid()
        AND uha.house_id = house_uuid
        AND uha.can_edit = true
        AND u.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM users
    WHERE id = auth.uid() AND is_active = true;
    
    RETURN user_role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- USERS POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (id = auth.uid() OR is_admin());

-- Users can update their own profile (except role)
CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admins can do everything
CREATE POLICY users_admin_all ON users
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- =====================================================
-- USER HOUSE ACCESS POLICIES
-- =====================================================

CREATE POLICY uha_select ON user_house_access
    FOR SELECT
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY uha_admin ON user_house_access
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================

-- Only admins can read audit logs
CREATE POLICY audit_logs_admin_select ON audit_logs
    FOR SELECT
    USING (is_admin());

-- Insert is handled by trigger with SECURITY DEFINER

-- =====================================================
-- HOUSES POLICIES
-- =====================================================

CREATE POLICY houses_select ON houses
    FOR SELECT
    USING (has_house_access(id));

CREATE POLICY houses_insert ON houses
    FOR INSERT
    WITH CHECK (is_admin() OR get_user_role() = 'manager');

CREATE POLICY houses_update ON houses
    FOR UPDATE
    USING (can_edit_house(id))
    WITH CHECK (can_edit_house(id));

CREATE POLICY houses_delete ON houses
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- ROOMS POLICIES
-- =====================================================

CREATE POLICY rooms_select ON rooms
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY rooms_insert ON rooms
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY rooms_update ON rooms
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY rooms_delete ON rooms
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- BEDS POLICIES
-- =====================================================

CREATE POLICY beds_select ON beds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_id 
            AND has_house_access(r.house_id)
        )
    );

CREATE POLICY beds_insert ON beds
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_id 
            AND can_edit_house(r.house_id)
        )
    );

CREATE POLICY beds_update ON beds
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_id 
            AND can_edit_house(r.house_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_id 
            AND can_edit_house(r.house_id)
        )
    );

CREATE POLICY beds_delete ON beds
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_id 
            AND can_edit_house(r.house_id)
        )
    );

-- =====================================================
-- TENANTS POLICIES
-- =====================================================

-- Tenants are visible if user has access to any house where tenant has a lease
CREATE POLICY tenants_select ON tenants
    FOR SELECT
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM leases l
            JOIN lease_participants lp ON lp.lease_id = l.id
            WHERE lp.tenant_id = tenants.id
            AND has_house_access(l.house_id)
        )
    );

CREATE POLICY tenants_insert ON tenants
    FOR INSERT
    WITH CHECK (
        is_admin() OR get_user_role() IN ('admin', 'manager')
    );

CREATE POLICY tenants_update ON tenants
    FOR UPDATE
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM leases l
            JOIN lease_participants lp ON lp.lease_id = l.id
            WHERE lp.tenant_id = tenants.id
            AND can_edit_house(l.house_id)
        )
    )
    WITH CHECK (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM leases l
            JOIN lease_participants lp ON lp.lease_id = l.id
            WHERE lp.tenant_id = tenants.id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY tenants_delete ON tenants
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- TENANT DOCUMENTS POLICIES
-- =====================================================

CREATE POLICY tenant_documents_select ON tenant_documents
    FOR SELECT
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM tenants t
            JOIN lease_participants lp ON lp.tenant_id = t.id
            JOIN leases l ON l.id = lp.lease_id
            WHERE t.id = tenant_documents.tenant_id
            AND has_house_access(l.house_id)
        )
    );

CREATE POLICY tenant_documents_insert ON tenant_documents
    FOR INSERT
    WITH CHECK (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM tenants t
            JOIN lease_participants lp ON lp.tenant_id = t.id
            JOIN leases l ON l.id = lp.lease_id
            WHERE t.id = tenant_id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY tenant_documents_delete ON tenant_documents
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- RESERVATIONS POLICIES
-- =====================================================

CREATE POLICY reservations_select ON reservations
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY reservations_insert ON reservations
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY reservations_update ON reservations
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY reservations_delete ON reservations
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- LEASES POLICIES
-- =====================================================

CREATE POLICY leases_select ON leases
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY leases_insert ON leases
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY leases_update ON leases
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY leases_delete ON leases
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- LEASE PARTICIPANTS POLICIES
-- =====================================================

CREATE POLICY lease_participants_select ON lease_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND has_house_access(l.house_id)
        )
    );

CREATE POLICY lease_participants_insert ON lease_participants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY lease_participants_update ON lease_participants
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY lease_participants_delete ON lease_participants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

-- =====================================================
-- RENT CHARGES POLICIES
-- =====================================================

CREATE POLICY rent_charges_select ON rent_charges
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY rent_charges_insert ON rent_charges
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY rent_charges_update ON rent_charges
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY rent_charges_delete ON rent_charges
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================

CREATE POLICY payments_select ON payments
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY payments_insert ON payments
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY payments_update ON payments
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY payments_delete ON payments
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- PAYMENT PROMISES POLICIES
-- =====================================================

CREATE POLICY payment_promises_select ON payment_promises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND has_house_access(l.house_id)
        )
    );

CREATE POLICY payment_promises_insert ON payment_promises
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY payment_promises_update ON payment_promises
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY payment_promises_delete ON payment_promises
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- TENANT ARREARS POLICIES
-- =====================================================

CREATE POLICY tenant_arrears_select ON tenant_arrears
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND has_house_access(l.house_id)
        )
    );

CREATE POLICY tenant_arrears_insert ON tenant_arrears
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

CREATE POLICY tenant_arrears_update ON tenant_arrears
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            WHERE l.id = lease_id
            AND can_edit_house(l.house_id)
        )
    );

-- =====================================================
-- BONDS POLICIES
-- =====================================================

CREATE POLICY bonds_select ON bonds
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY bonds_insert ON bonds
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY bonds_update ON bonds
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY bonds_delete ON bonds
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- BILLS POLICIES
-- =====================================================

CREATE POLICY bills_select ON bills
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY bills_insert ON bills
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY bills_update ON bills
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY bills_delete ON bills
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- BILL ALLOCATIONS POLICIES
-- =====================================================

CREATE POLICY bill_allocations_select ON bill_allocations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bills b
            WHERE b.id = bill_id
            AND has_house_access(b.house_id)
        )
    );

CREATE POLICY bill_allocations_insert ON bill_allocations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bills b
            WHERE b.id = bill_id
            AND can_edit_house(b.house_id)
        )
    );

CREATE POLICY bill_allocations_update ON bill_allocations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bills b
            WHERE b.id = bill_id
            AND can_edit_house(b.house_id)
        )
    );

CREATE POLICY bill_allocations_delete ON bill_allocations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM bills b
            WHERE b.id = bill_id
            AND can_edit_house(b.house_id)
        )
    );

-- =====================================================
-- EXPENSES POLICIES
-- =====================================================

CREATE POLICY expenses_select ON expenses
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY expenses_insert ON expenses
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY expenses_update ON expenses
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY expenses_delete ON expenses
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- MAINTENANCE TICKETS POLICIES
-- =====================================================

CREATE POLICY maintenance_tickets_select ON maintenance_tickets
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY maintenance_tickets_insert ON maintenance_tickets
    FOR INSERT
    WITH CHECK (has_house_access(house_id)); -- Any user with access can create

CREATE POLICY maintenance_tickets_update ON maintenance_tickets
    FOR UPDATE
    USING (has_house_access(house_id))
    WITH CHECK (has_house_access(house_id));

CREATE POLICY maintenance_tickets_delete ON maintenance_tickets
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- MAINTENANCE PHOTOS POLICIES
-- =====================================================

CREATE POLICY maintenance_photos_select ON maintenance_photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM maintenance_tickets mt
            WHERE mt.id = ticket_id
            AND has_house_access(mt.house_id)
        )
    );

CREATE POLICY maintenance_photos_insert ON maintenance_photos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM maintenance_tickets mt
            WHERE mt.id = ticket_id
            AND has_house_access(mt.house_id)
        )
    );

CREATE POLICY maintenance_photos_delete ON maintenance_photos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM maintenance_tickets mt
            WHERE mt.id = ticket_id
            AND can_edit_house(mt.house_id)
        )
    );

-- =====================================================
-- CHECKLISTS POLICIES
-- =====================================================

CREATE POLICY checklists_select ON checklists
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY checklists_insert ON checklists
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY checklists_update ON checklists
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY checklists_delete ON checklists
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- CHECKLIST ITEMS POLICIES
-- =====================================================

CREATE POLICY checklist_items_select ON checklist_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_id
            AND has_house_access(c.house_id)
        )
    );

CREATE POLICY checklist_items_insert ON checklist_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_id
            AND can_edit_house(c.house_id)
        )
    );

CREATE POLICY checklist_items_update ON checklist_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_id
            AND can_edit_house(c.house_id)
        )
    );

CREATE POLICY checklist_items_delete ON checklist_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_id
            AND can_edit_house(c.house_id)
        )
    );

-- =====================================================
-- INVENTORY ITEMS POLICIES
-- =====================================================

CREATE POLICY inventory_items_select ON inventory_items
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY inventory_items_insert ON inventory_items
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY inventory_items_update ON inventory_items
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY inventory_items_delete ON inventory_items
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- CLEANING ROSTER POLICIES
-- =====================================================

CREATE POLICY cleaning_roster_select ON cleaning_roster
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY cleaning_roster_insert ON cleaning_roster
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY cleaning_roster_update ON cleaning_roster
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY cleaning_roster_delete ON cleaning_roster
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- HOUSE RULES VERSIONS POLICIES
-- =====================================================

CREATE POLICY house_rules_versions_select ON house_rules_versions
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY house_rules_versions_insert ON house_rules_versions
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY house_rules_versions_update ON house_rules_versions
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY house_rules_versions_delete ON house_rules_versions
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- WARNINGS POLICIES
-- =====================================================

CREATE POLICY warnings_select ON warnings
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY warnings_insert ON warnings
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY warnings_update ON warnings
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY warnings_delete ON warnings
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- KEYS POLICIES
-- =====================================================

CREATE POLICY keys_select ON keys
    FOR SELECT
    USING (has_house_access(house_id));

CREATE POLICY keys_insert ON keys
    FOR INSERT
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY keys_update ON keys
    FOR UPDATE
    USING (can_edit_house(house_id))
    WITH CHECK (can_edit_house(house_id));

CREATE POLICY keys_delete ON keys
    FOR DELETE
    USING (can_edit_house(house_id));

-- =====================================================
-- CANDIDATES POLICIES
-- =====================================================

-- Candidates can be viewed by users with access to the preferred house
-- or by all managers/admins if no house preference
CREATE POLICY candidates_select ON candidates
    FOR SELECT
    USING (
        is_admin() OR 
        get_user_role() IN ('admin', 'manager') OR
        (house_id IS NOT NULL AND has_house_access(house_id))
    );

CREATE POLICY candidates_insert ON candidates
    FOR INSERT
    WITH CHECK (true); -- Public can submit applications

CREATE POLICY candidates_update ON candidates
    FOR UPDATE
    USING (
        is_admin() OR 
        get_user_role() IN ('admin', 'manager') OR
        (house_id IS NOT NULL AND can_edit_house(house_id))
    )
    WITH CHECK (
        is_admin() OR 
        get_user_role() IN ('admin', 'manager') OR
        (house_id IS NOT NULL AND can_edit_house(house_id))
    );

CREATE POLICY candidates_delete ON candidates
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- ALERTS POLICIES
-- =====================================================

CREATE POLICY alerts_select ON alerts
    FOR SELECT
    USING (
        house_id IS NULL OR has_house_access(house_id)
    );

CREATE POLICY alerts_insert ON alerts
    FOR INSERT
    WITH CHECK (
        house_id IS NULL OR can_edit_house(house_id)
    );

CREATE POLICY alerts_update ON alerts
    FOR UPDATE
    USING (
        house_id IS NULL OR has_house_access(house_id)
    )
    WITH CHECK (
        house_id IS NULL OR has_house_access(house_id)
    );

CREATE POLICY alerts_delete ON alerts
    FOR DELETE
    USING (
        house_id IS NULL OR can_edit_house(house_id)
    );
