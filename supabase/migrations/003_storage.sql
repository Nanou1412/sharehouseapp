-- =====================================================
-- SUPABASE STORAGE BUCKETS
-- =====================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('tenant-documents', 'tenant-documents', false),
    ('maintenance-photos', 'maintenance-photos', false),
    ('checklist-photos', 'checklist-photos', false),
    ('inventory-photos', 'inventory-photos', false),
    ('bill-invoices', 'bill-invoices', false),
    ('expense-receipts', 'expense-receipts', false),
    ('public-listings', 'public-listings', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Tenant Documents Bucket
CREATE POLICY "tenant_docs_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'tenant-documents' AND
        (
            EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
            ) OR
            EXISTS (
                SELECT 1 FROM tenant_documents td
                JOIN tenants t ON t.id = td.tenant_id
                JOIN lease_participants lp ON lp.tenant_id = t.id
                JOIN leases l ON l.id = lp.lease_id
                JOIN user_house_access uha ON uha.house_id = l.house_id
                WHERE td.file_path = name
                AND uha.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "tenant_docs_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'tenant-documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "tenant_docs_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'tenant-documents' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Maintenance Photos Bucket
CREATE POLICY "maintenance_photos_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'maintenance-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "maintenance_photos_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'maintenance-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "maintenance_photos_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'maintenance-photos' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Checklist Photos Bucket
CREATE POLICY "checklist_photos_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'checklist-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "checklist_photos_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'checklist-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "checklist_photos_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'checklist-photos' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Inventory Photos Bucket
CREATE POLICY "inventory_photos_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'inventory-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "inventory_photos_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'inventory-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "inventory_photos_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'inventory-photos' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Bill Invoices Bucket
CREATE POLICY "bill_invoices_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'bill-invoices' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "bill_invoices_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'bill-invoices' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "bill_invoices_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'bill-invoices' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Expense Receipts Bucket
CREATE POLICY "expense_receipts_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'expense-receipts' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "expense_receipts_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'expense-receipts' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "expense_receipts_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'expense-receipts' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Public Listings Bucket (publicly accessible)
CREATE POLICY "public_listings_select" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'public-listings');

CREATE POLICY "public_listings_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'public-listings' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "public_listings_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'public-listings' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "public_listings_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'public-listings' AND
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );
