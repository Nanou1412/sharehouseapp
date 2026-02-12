import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

export const userRoleSchema = z.enum(['admin', 'manager', 'maintenance']);
export const roomTypeSchema = z.enum(['private', 'shared']);
export const bedStatusSchema = z.enum(['available', 'occupied', 'reserved', 'maintenance']);
export const tenantStatusSchema = z.enum(['active', 'inactive', 'blacklisted']);
export const leaseStatusSchema = z.enum(['draft', 'active', 'ending', 'ended', 'broken']);
export const reservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'converted']);
export const chargeStatusSchema = z.enum(['pending', 'partial', 'paid', 'overdue', 'waived']);
export const paymentMethodSchema = z.enum(['bank_transfer', 'cash', 'card', 'other']);
export const arrearsStatusSchema = z.enum(['current', 'late', 'reminder_sent', 'payment_plan', 'default']);
export const bondStatusSchema = z.enum(['pending', 'received', 'partial', 'refunded', 'forfeited']);
export const billTypeSchema = z.enum(['electricity', 'gas', 'water', 'internet', 'council_rates', 'insurance', 'other']);
export const billSplitModeSchema = z.enum(['included', 'equal_per_occupant', 'per_bed', 'prorata_days', 'flat_weekly_per_person']);
export const billStatusSchema = z.enum(['pending', 'allocated', 'paid']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const ticketStatusSchema = z.enum(['open', 'in_progress', 'waiting_parts', 'completed', 'cancelled']);
export const ticketResponsibilitySchema = z.enum(['landlord', 'tenant', 'shared']);
export const checklistTypeSchema = z.enum(['move_in', 'move_out']);
export const checklistStatusSchema = z.enum(['pending', 'in_progress', 'completed']);
export const itemConditionSchema = z.enum(['new', 'good', 'fair', 'poor', 'damaged', 'missing']);
export const keyStatusSchema = z.enum(['available', 'issued', 'lost', 'replaced']);
export const warningSeveritySchema = z.enum(['verbal', 'written', 'final']);
export const candidateStatusSchema = z.enum(['new', 'screening', 'approved', 'rejected', 'waitlist']);
export const alertTypeSchema = z.enum(['occupancy', 'arrears', 'maintenance', 'bills', 'lease_expiry', 'vacancy']);
export const alertPrioritySchema = z.enum(['info', 'warning', 'critical']);
export const expenseCategorySchema = z.enum(['maintenance', 'utilities', 'supplies', 'insurance', 'council', 'mortgage', 'management', 'other']);

// =====================================================
// HOUSES
// =====================================================

export const houseFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().min(1, 'Address is required').max(200),
  suburb: z.string().min(1, 'Suburb is required').max(100),
  postcode: z.string().min(4, 'Valid postcode required').max(10),
  state: z.string().default('WA'),
  country: z.string().default('Australia'),
  property_manager: z.string().optional().nullable(),
  owner_name: z.string().optional().nullable(),
  owner_contact: z.string().optional().nullable(),
  default_bond_weeks: z.number().int().min(1).max(8).default(4),
  default_bill_split_mode: billSplitModeSchema.default('equal_per_occupant'),
  prorate_move_in: z.boolean().default(false),
  prorate_move_out: z.boolean().default(true),
  wifi_ssid: z.string().optional().nullable(),
  wifi_password: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type HouseFormData = z.infer<typeof houseFormSchema>;

// =====================================================
// ROOMS
// =====================================================

export const roomFormSchema = z.object({
  house_id: z.string().uuid(),
  name: z.string().min(1, 'Room name is required').max(50),
  room_type: roomTypeSchema,
  floor: z.number().int().optional().nullable(),
  has_ensuite: z.boolean().default(false),
  has_balcony: z.boolean().default(false),
  has_ac: z.boolean().default(false),
  size_sqm: z.number().positive().optional().nullable(),
  weekly_rent: z.number().positive().optional().nullable(),
  bond_amount: z.number().positive().optional().nullable(),
  couple_allowed: z.boolean().default(false),
  couple_surcharge: z.number().min(0).default(0),
  max_occupants: z.number().int().min(1).default(1),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type RoomFormData = z.infer<typeof roomFormSchema>;

// =====================================================
// BEDS
// =====================================================

export const bedFormSchema = z.object({
  room_id: z.string().uuid(),
  bed_number: z.number().int().min(1),
  bed_type: z.string().default('single'),
  weekly_rent: z.number().positive('Weekly rent must be positive'),
  bond_amount: z.number().positive().optional().nullable(),
  status: bedStatusSchema.default('available'),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type BedFormData = z.infer<typeof bedFormSchema>;

// =====================================================
// TENANTS
// =====================================================

export const tenantFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email required'),
  phone: z.string().min(8, 'Valid phone required').max(20),
  date_of_birth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  visa_type: z.string().optional().nullable(),
  visa_expiry: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relation: z.string().optional().nullable(),
  employer: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  weekly_income: z.number().positive().optional().nullable(),
  previous_address: z.string().optional().nullable(),
  previous_landlord_contact: z.string().optional().nullable(),
  id_type: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  id_expiry: z.string().optional().nullable(),
  status: tenantStatusSchema.default('active'),
  risk_score: z.number().int().min(0).max(100).optional().nullable(),
  risk_notes: z.string().optional().nullable(),
  is_blacklisted: z.boolean().default(false),
  blacklist_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;

// =====================================================
// RESERVATIONS
// =====================================================

export const reservationFormSchema = z.object({
  house_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable(),
  bed_id: z.string().uuid().optional().nullable(),
  tenant_id: z.string().uuid(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  weekly_rent: z.number().positive('Weekly rent must be positive'),
  bond_amount: z.number().min(0, 'Bond must be non-negative'),
  status: reservationStatusSchema.default('pending'),
  deposit_amount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
}).refine((data: { room_id?: string | null; bed_id?: string | null }) => data.room_id || data.bed_id, {
  message: 'Either room or bed must be selected',
  path: ['room_id'],
});

export type ReservationFormData = z.infer<typeof reservationFormSchema>;

// =====================================================
// LEASES
// =====================================================

export const leaseFormSchema = z.object({
  reservation_id: z.string().uuid().optional().nullable(),
  house_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable(),
  bed_id: z.string().uuid().optional().nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  notice_period_weeks: z.number().int().min(0).default(2),
  weekly_rent: z.number().positive('Weekly rent must be positive'),
  bond_amount: z.number().min(0, 'Bond must be non-negative'),
  status: leaseStatusSchema.default('draft'),
  is_couple: z.boolean().default(false),
  notes: z.string().optional().nullable(),
}).refine((data: { room_id?: string | null; bed_id?: string | null }) => data.room_id || data.bed_id, {
  message: 'Either room or bed must be selected',
  path: ['room_id'],
});

export type LeaseFormData = z.infer<typeof leaseFormSchema>;

// =====================================================
// LEASE PARTICIPANTS
// =====================================================

export const leaseParticipantFormSchema = z.object({
  lease_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  rent_share_percent: z.number().min(0.01).max(100).default(100),
  is_primary: z.boolean().default(true),
  moved_in_at: z.string().optional().nullable(),
  moved_out_at: z.string().optional().nullable(),
});

export type LeaseParticipantFormData = z.infer<typeof leaseParticipantFormSchema>;

// =====================================================
// PAYMENTS
// =====================================================

export const paymentFormSchema = z.object({
  house_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  lease_id: z.string().uuid().optional().nullable(),
  rent_charge_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  payment_method: paymentMethodSchema,
  payment_date: z.string().min(1, 'Payment date is required'),
  reference: z.string().optional().nullable(),
  is_advance_payment: z.boolean().default(false),
  is_partial: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;

// =====================================================
// BONDS
// =====================================================

export const bondFormSchema = z.object({
  lease_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  house_id: z.string().uuid(),
  expected_amount: z.number().positive('Expected amount must be positive'),
  received_amount: z.number().min(0).default(0),
  received_date: z.string().optional().nullable(),
  lodged_with: z.string().optional().nullable(),
  lodgement_reference: z.string().optional().nullable(),
  status: bondStatusSchema.default('pending'),
  notes: z.string().optional().nullable(),
});

export type BondFormData = z.infer<typeof bondFormSchema>;

export const bondDeductionSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  amount: z.number().positive('Amount must be positive'),
});

export type BondDeduction = z.infer<typeof bondDeductionSchema>;

// =====================================================
// BILLS
// =====================================================

export const billFormSchema = z.object({
  house_id: z.string().uuid(),
  bill_type: billTypeSchema,
  provider: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  period_start: z.string().min(1, 'Period start is required'),
  period_end: z.string().min(1, 'Period end is required'),
  due_date: z.string().min(1, 'Due date is required'),
  total_amount: z.number().positive('Total amount must be positive'),
  split_mode: billSplitModeSchema,
  status: billStatusSchema.default('pending'),
  notes: z.string().optional().nullable(),
});

export type BillFormData = z.infer<typeof billFormSchema>;

// =====================================================
// MAINTENANCE TICKETS
// =====================================================

export const maintenanceTicketFormSchema = z.object({
  house_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable(),
  reported_by_tenant: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  priority: ticketPrioritySchema.default('medium'),
  status: ticketStatusSchema.default('open'),
  responsibility: ticketResponsibilitySchema.default('landlord'),
  estimated_cost: z.number().positive().optional().nullable(),
  actual_cost: z.number().positive().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  contractor_name: z.string().optional().nullable(),
  contractor_contact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type MaintenanceTicketFormData = z.infer<typeof maintenanceTicketFormSchema>;

// =====================================================
// EXPENSES
// =====================================================

export const expenseFormSchema = z.object({
  house_id: z.string().uuid(),
  category: expenseCategorySchema,
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  expense_date: z.string().min(1, 'Date is required'),
  is_recurring: z.boolean().default(false),
  recurrence_period: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  maintenance_ticket_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

// =====================================================
// CHECKLISTS
// =====================================================

export const checklistFormSchema = z.object({
  lease_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  house_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable(),
  checklist_type: checklistTypeSchema,
  status: checklistStatusSchema.default('pending'),
  scheduled_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ChecklistFormData = z.infer<typeof checklistFormSchema>;

export const checklistItemFormSchema = z.object({
  checklist_id: z.string().uuid(),
  item_name: z.string().min(1, 'Item name is required'),
  location: z.string().optional().nullable(),
  condition: itemConditionSchema,
  condition_notes: z.string().optional().nullable(),
  photo_path: z.string().optional().nullable(),
  requires_action: z.boolean().default(false),
  action_notes: z.string().optional().nullable(),
});

export type ChecklistItemFormData = z.infer<typeof checklistItemFormSchema>;

// =====================================================
// INVENTORY
// =====================================================

export const inventoryItemFormSchema = z.object({
  house_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable(),
  item_name: z.string().min(1, 'Item name is required'),
  category: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  condition: itemConditionSchema.default('good'),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.number().positive().optional().nullable(),
  current_value: z.number().positive().optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

// =====================================================
// CLEANING ROSTER
// =====================================================

export const cleaningRosterFormSchema = z.object({
  house_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  week_start: z.string().min(1, 'Week start is required'),
  areas: z.array(z.string()).min(1, 'At least one area required'),
  is_completed: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export type CleaningRosterFormData = z.infer<typeof cleaningRosterFormSchema>;

// =====================================================
// HOUSE RULES
// =====================================================

export const houseRulesFormSchema = z.object({
  house_id: z.string().uuid(),
  rules_content: z.string().min(1, 'Rules content is required'),
  effective_from: z.string().min(1, 'Effective date is required'),
});

export type HouseRulesFormData = z.infer<typeof houseRulesFormSchema>;

// =====================================================
// WARNINGS
// =====================================================

export const warningFormSchema = z.object({
  tenant_id: z.string().uuid(),
  lease_id: z.string().uuid().optional().nullable(),
  house_id: z.string().uuid(),
  severity: warningSeveritySchema,
  rule_violated: z.string().min(1, 'Rule violated is required'),
  description: z.string().min(1, 'Description is required'),
  incident_date: z.string().min(1, 'Incident date is required'),
  strike_number: z.number().int().min(1).default(1),
});

export type WarningFormData = z.infer<typeof warningFormSchema>;

// =====================================================
// KEYS
// =====================================================

export const keyFormSchema = z.object({
  house_id: z.string().uuid(),
  key_type: z.string().min(1, 'Key type is required'),
  key_number: z.string().min(1, 'Key number is required'),
  status: keyStatusSchema.default('available'),
  room_id: z.string().uuid().optional().nullable(),
  issued_to_tenant: z.string().uuid().optional().nullable(),
  issued_date: z.string().optional().nullable(),
  returned_date: z.string().optional().nullable(),
  replacement_cost: z.number().min(0).default(50),
  notes: z.string().optional().nullable(),
});

export type KeyFormData = z.infer<typeof keyFormSchema>;

// =====================================================
// CANDIDATES
// =====================================================

export const candidateFormSchema = z.object({
  house_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  bed_id: z.string().uuid().optional().nullable(),
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email required'),
  phone: z.string().min(8, 'Valid phone required').max(20),
  preferred_move_in: z.string().optional().nullable(),
  budget_min: z.number().positive().optional().nullable(),
  budget_max: z.number().positive().optional().nullable(),
  occupation: z.string().optional().nullable(),
  employer: z.string().optional().nullable(),
  visa_status: z.string().optional().nullable(),
  current_situation: z.string().optional().nullable(),
  about_me: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export type CandidateFormData = z.infer<typeof candidateFormSchema>;

// =====================================================
// PAYMENT PROMISES
// =====================================================

export const paymentPromiseFormSchema = z.object({
  tenant_id: z.string().uuid(),
  lease_id: z.string().uuid(),
  promised_amount: z.number().positive('Amount must be positive'),
  promised_date: z.string().min(1, 'Promised date is required'),
  notes: z.string().optional().nullable(),
});

export type PaymentPromiseFormData = z.infer<typeof paymentPromiseFormSchema>;

// =====================================================
// AUTH
// =====================================================

export const loginFormSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').max(100),
});

export type SignupFormData = z.infer<typeof signupFormSchema>;
