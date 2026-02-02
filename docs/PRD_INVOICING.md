# PRD: Activity-Based Costs, Invoicing & Payments

**Module**: Invoicing & Payments
**Status**: MVP2 Implementation Complete — Security hardened
**Last updated**: 2026-02-01
**Owner**: Product

---

## 1. Context & Problem

Stables and riding schools charge beyond basic membership + stall rent: extra services (blanketing, turnout, mucking), consumables (bedding, feed add-ons), facility fees (indoor arena/riding hall), equipment/locker rental, lessons, training packages, and prepaid course bundles (klippkort).

"What's included vs. extra" is a constant source of friction and needs clear line-item transparency.

Many operations invoice on recurring cadences (monthly, term/period billing, or multiple times per year) and often send invoices by email or manual routines. Swedish riding schools commonly bill per term (hösttermin/vårtermin) for lessons and monthly for stall rent.

### Core Pain Points

| Pain Point | Description |
|---|---|
| **Admin overhead** | Manually tracking extras, building invoices, reminding members |
| **Disputes** | Unclear line items ("why is this on my invoice?"), split VAT rates across horse activities |
| **Poor cashflow follow-up** | Knowing who has paid, and when to escalate (reminders/collection workflows) |
| **Fragmented tooling** | Many use generic accounting tools (Fortnox, Bokio) rather than stable-centric workflows |
| **Family billing complexity** | Parents paying for multiple children's activities across horses |
| **Prepaid package tracking** | Klippkort/punch cards tracked on paper or spreadsheets |

---

## 2. Goals & Non-Goals

### Goals (MVP1: Internal Invoicing)

1. Let an organization add billable costs tied to:
   - Activities (e.g., "Jump lesson", "Training clinic")
   - Bookable resources (e.g., trailer, saddle, locker, arena slot)
   - Add-on services (e.g., turnout/blanketing/mucking)
   - Recurring plans (stall rent, membership, facility fee)
2. **Prepaid packages (klippkort)**: Sell and track usage of lesson bundles and service packages
3. **Family/group billing**: Link members to a billing contact (parent/guardian) who receives consolidated invoices
4. Generate **Swedish-compliant invoices** with line-by-line entries, sequential numbering, and proper VAT handling
5. Support recurring invoicing cadences (monthly + term-based + configurable cycles)
6. Provide accounts receivable view: Draft → Sent → Paid/Partially Paid → Overdue
7. **Credit notes** (kreditfaktura) as first-class documents
8. Export invoices (PDF/email + CSV export)

### Goals (MVP2: Payments + Disputes + Commission)

9. **Stripe Connect onboarding** for organizations (Standard accounts) — each org connects their own Stripe account
10. **Invoice payments** via Stripe Checkout: card + Swish (via Stripe's native Swish support, no direct Swish API)
11. **Saved payment methods** — members save cards via Stripe (no PCI scope increase for EquiDuty)
12. **Invoice email delivery** — send invoices with "Pay Now" payment links; payment confirmation/failure emails
13. **One-time Checkout + saved cards** — both payment flows supported
14. **Refund processing** — admin-initiated full and partial refunds via Stripe, linked to credit notes
15. **Member dispute flow** — members flag line items or invoices, comment thread with admin, resolution workflow
16. **Payment dashboard** — org admin overview of collected, pending, failed, and refunded payments with Stripe fee transparency
17. **Trainer commission (Level 2)** — org defines commission rules per trainer, system calculates owed amounts, org pays trainer externally
18. **Klippkort online purchase** — members purchase prepaid packages from the portal via Stripe Checkout
19. **Application fee** — platform per-transaction revenue via Stripe `application_fee_amount` on connected account payments

### Goals (MVP3: Finance & Settlement)

12. Accounting/finance integration: exports (CSV/SIE4), configurable field mappings
13. API connectors to Swedish finance systems (Fortnox, Bokio)
14. **Autogiro** (direct debit) for recurring fees
15. **Trainer full settlement** via Stripe Connect (org opt-in)

### Non-Goals (initially)

- Full general-ledger accounting inside EquiDuty (keep it AR-focused)
- Complex revenue recognition, multi-entity accounting, or payroll
- E-invoicing (Peppol) — roadmap item, not MVP
- Debt collection agency integration
- Multi-currency (SEK only for MVP)

---

## 3. Primary Personas

### 1. Platform Provider (EquiDuty Ops/Admin)

- Configuration knobs, pricing/limits per tier, support tooling, auditability
- Feature-flag invoicing/payments/exports per subscription tier

### 2. Organization Owner / Stable Admin

- Creates chargeable items, sets rules, reviews drafts, sends invoices, follows up
- Configures billing cadences, payment terms, reminder schedules
- Manages family billing relationships and prepaid packages

### 3. Member / Customer

- Understands charges, sees history, pays (optionally), disputes items
- May be a **billing contact** for family members (children)

### 4. Billing Contact (Parent/Guardian)

- Receives consolidated invoices for linked family members
- Can view and pay invoices for all linked members
- May or may not be a member themselves

### 5. Trainer (cross-org)

- Provides services for one or more organizations
- Sees attendance + billable summary per org
- Compensation model configurable per org: attribution only → commission % → full settlement

---

## 4. Core Use Cases

### UC1: Add costs to an activity

- Admin creates an activity (or lesson) with:
  - Base price per participant, optional add-ons (e.g., "video review")
  - Attendance list → generates line items per member
- Supports partial-period billing (e.g., join mid-term; invoice remaining sessions)
- Klippkort deduction: if member has active package, deduct from package instead of creating billable line item

### UC2: Add costs to a booking (inventory/equipment/facility)

- "Bookable item" (trailer, tack, indoor arena) has:
  - Rate rules: per hour / per booking / per day / deposit
  - Cancellation rules: charge/no-charge windows
  - No-show fee rules

### UC3: Recurring monthly charges + usage-based extras

- Member has monthly base fee (stall rent, membership, facility fee)
- Per-horse pricing: a member with 2 horses may have different service packages per horse
- Extras added during the month appear as separate line items
- Klippkort purchases appear as one-time charges

### UC4: Prepaid packages (klippkort)

- Admin defines packages: "10 jumping lessons" at a discounted price
- Member purchases package → single line item / invoice
- Each lesson attended decrements the package balance
- Admin and member can see remaining balance
- Packages can have expiry dates
- Unused sessions: configurable policy (expire / rollover / partial refund)
- Packages can be marked as transferable within billing group — any member in the same group can use sessions
- Mid-term cancellation: org-configurable policy per package (no refund / pro-rata unit / pro-rata package / full refund)

### UC5: Billing group consolidation

- Admin creates a billing group linking members to a billing contact
- Supports multiple relationship types: parent/guardian, company, sponsor, or custom
- All charges for linked members roll up to the billing contact's invoice
- Invoice shows clear per-member breakdown within the consolidated view
- Billing contact can view/pay for all linked members
- Transferable klippkort sessions are shared across the group

### UC6: Generate and send invoices

- **MVP1**: Generate PDF + email via EquiDuty, mark paid manually or via import
- **MVP2**: Stripe invoice / Swish payment; webhooks update status to Paid/Failed
- Invoice must comply with Swedish requirements (see section 5.3)

### UC7: Disputes and corrections

- Member flags a line item → admin can:
  - Issue credit note (kreditfaktura) referencing original invoice
  - Void draft invoice (before sent)
  - Add comment log (audit trail)
- Credit notes get their own sequential number series

### UC8: No-show and cancellation fees

- Tied to booking system cancellation rules
- Auto-generate line item when cancellation window has passed
- Member can dispute with reason

### UC9: Trainer attribution and compensation

- **Level 1 — Attribution**: Track which trainer delivered which activity. Trainer sees read-only summary per org.
- **Level 2 — Commission**: Org defines commission % per trainer per activity type. System calculates owed amounts. Trainer sees summary. Org pays externally.
- **Level 3 — Settlement** (MVP3): EquiDuty handles trainer payouts via Stripe Connect. Org opts in per trainer.

---

## 5. Functional Requirements

### 5.1 Charge Catalog (Products/Services)

Create **Chargeable Items** with:

| Field | Description | Required |
|---|---|---|
| `name` | Display name (e.g., "Hoppkurs grupplek") | Yes |
| `description` | Detailed description | No |
| `unitType` | `fixed` / `per_hour` / `per_session` / `per_quantity` / `per_day` | Yes |
| `defaultUnitPrice` | Default price in SEK (öre) | Yes |
| `vatRate` | VAT rate: `25%`, `12%`, `6%`, `0%` | Yes |
| `vatCategory` | Category label for reporting | Yes |
| `accountingCode` | GL/accounting code (optional MVP1, required for exports) | No |
| `costCenter` | Cost center reference | No |
| `category` | `activity` / `booking` / `service` / `recurring` / `package` | Yes |
| `isActive` | Enable/disable | Yes |

Attach items to:
- Activity templates
- Booking/inventory types
- Member recurring plans
- Prepaid packages (with quantity and optional discount)

### 5.2 Prepaid Packages

| Field | Description |
|---|---|
| `name` | Package name (e.g., "10-kort Hoppning") |
| `chargeableItemId` | Which service this covers |
| `totalUnits` | Number of sessions/uses included |
| `price` | Total package price (may be discounted vs. unit price × qty) |
| `validityDays` | Days from purchase until expiry (null = no expiry) |
| `expiryPolicy` | `expire` / `rollover` / `partial_refund` |
| `transferableWithinGroup` | Whether sessions can be used by any member in the same billing group (default: `false`) |
| `cancellationPolicy` | `no_refund` / `pro_rata_unit` / `pro_rata_package` / `full_refund` — org-configurable policy for mid-term cancellations |

**MemberPackage** (purchased instance):

| Field | Description |
|---|---|
| `memberId` | Who owns the package (or `null` if group-owned) |
| `billingGroupId` | Billing group that owns the package (if `transferableWithinGroup` is true) |
| `packageId` | Which package definition |
| `purchaseDate` | When purchased |
| `expiresAt` | Calculated from validityDays |
| `remainingUnits` | Decremented on usage |
| `status` | `active` / `expired` / `depleted` / `refunded` / `cancelled` |

### 5.3 Invoicing (Swedish Compliance)

#### Mandatory Invoice Fields (Bokföringslagen / Skatteverket)

| Field | Description |
|---|---|
| `invoiceNumber` | **Unbroken sequential numbering** per organization. Separate series for credit notes. |
| `issueDate` | Fakturadatum |
| `dueDate` | Förfallodatum |
| `orgName` | Organization legal name |
| `orgNumber` | Organisationsnummer |
| `orgVatNumber` | Momsregistreringsnummer (if VAT registered) |
| `orgAddress` | Full address |
| `orgBankgiro` | Bankgiro number (for payment) |
| `orgPlusgiro` | Plusgiro number (optional) |
| `orgSwish` | Swish number (optional) |
| `customerName` | Billing contact / member name |
| `customerAddress` | Billing address |
| `ocrNumber` | OCR payment reference (auto-generated) |
| `paymentTermsDays` | Betalningsvillkor (e.g., 30 days) |
| `currency` | `SEK` |
| `lineItems[]` | Itemized charges with unit price, qty, VAT rate, total |
| `vatSummary[]` | VAT grouped by rate (25%, 12%, 6%, 0%) |
| `totalExclVat` | Total excl. moms |
| `totalVat` | Total moms |
| `totalInclVat` | Total inkl. moms |
| `roundingAmount` | Öresavrundning (Swedish rounding to whole SEK) |

**Öresavrundning (mandatory)**: All invoice totals (`totalInclVat`) MUST be rounded to the nearest whole SEK. The `roundingAmount` field records the difference between the exact calculated total and the rounded total. This applies to all invoices regardless of payment method.

#### Invoice Workflow

```
Draft → Review → Sent → [Reminder 1] → [Reminder 2] → Paid / Partially Paid / Overdue / Written Off
                    ↓
              Credit Note (kreditfaktura) ← references original invoice
```

#### Invoice Creation Modes

1. **Scheduled recurring run** — monthly/quarterly/term-based/custom cadence
2. **Manual run** — select members, date range, sources
3. **Package purchase** — immediate invoice on klippkort purchase

#### Reminder Configuration (per org)

| Setting | Default |
|---|---|
| `reminder1DaysAfterDue` | 14 |
| `reminder2DaysAfterDue` | 30 |
| `reminderFee` (påminnelseavgift) | 60 SEK |
| `lateInterestRate` (dröjsmålsränta) | Riksbankens referensränta + 8% |
| `maxReminders` | 2 |

### 5.4 Line Items Engine

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `invoiceId` | string | Parent invoice (null if pending) |
| `memberId` | string | Charged member |
| `billingContactId` | string | Who pays (may differ from member for family billing) |
| `date` | date | Service date |
| `chargeableItemId` | string | Reference to catalog item |
| `description` | string | Line item description |
| `quantity` | number | Quantity |
| `unitPrice` | number | Price per unit (öre) |
| `vatRate` | number | VAT % |
| `totalExclVat` | number | Calculated |
| `totalVat` | number | Calculated |
| `totalInclVat` | number | Calculated |
| `sourceType` | enum | `activity` / `booking` / `recurring` / `manual` / `package_purchase` / `cancellation_fee` / `no_show_fee` |
| `sourceId` | string | Reference to source entity |
| `idempotencyKey` | string | Prevents double-billing |
| `packageDeductionId` | string | If deducted from klippkort instead of billed |
| `horseId` | string | Which horse (for per-horse charges) |
| `status` | enum | `pending` → `invoiced` → `credited` |

### 5.5 Billing Groups

Billing groups are a generic mechanism for consolidating charges across multiple members onto a single invoice. They support family, company, sponsor, and custom relationship types from MVP1.

| Entity | Description |
|---|---|
| `BillingGroup` | Links members to a billing contact |
| `billingGroupId` | Unique identifier |
| `billingContactId` | The person who receives and pays invoices |
| `memberIds[]` | Linked members whose charges roll up |
| `relationshipType` | `parent` / `guardian` / `company` / `sponsor` / `other` |
| `label` | Optional display label (e.g., "Familjen Andersson", "Ridklubben AB") |
| `organizationId` | Owning organization |

Invoice generation:
- Collect all pending line items for members in the billing group
- Generate single invoice addressed to billing contact
- Line items grouped by member within the invoice
- Transferable klippkort: if a package has `transferableWithinGroup: true`, any member in the billing group can use sessions from that package

### 5.6 Credit Notes (Kreditfaktura)

Credit notes are separate documents with:
- Own sequential number series (e.g., `KF-0001`)
- Reference to original invoice number
- Negative amounts
- Reason/description
- Same VAT breakdown as original

### 5.7 Member Experience

Member can (MVP1):
- View invoices and line items (with source explanations)
- View prepaid package balances and usage history
- Download PDF
- See payment status and history

Member can (MVP2 additions):
- Pay invoices online (card / Swish) via Stripe Checkout from member portal
- Save payment methods (cards) for faster future payments
- Pay with a saved card (Payment Intent with existing method)
- Receive invoice email with "Pay Now" payment link
- Receive payment confirmation email after successful payment
- Receive payment failure email with retry link
- Raise disputes on specific line items or whole invoices
- Add comments in dispute thread with org admin
- Track dispute status: `open` → `under_review` → `resolved` / `rejected`
- Purchase klippkort packages from the portal (Stripe Checkout)
- Download payment receipts (Stripe `receipt_url` for online payments)
- Manage saved payment methods in portal (add, remove, set default)

### 5.8 Trainer Experience (cross-org)

- **Level 1**: View attendance + billable summary per org (read-only)
- **Level 2**: View calculated commission per org, per period
- **Level 3**: Receive payouts via Stripe Connect (org opts in)

Trainers can:
- Create/host activities (if granted permissions by each org)
- See per-org summary of delivered sessions and revenue
- Export own activity reports

### 5.9 Payments (MVP2)

#### 5.9.1 Stripe Connect Onboarding

Organizations connect their own Stripe account via **Stripe Connect — Standard accounts**. This gives each org full control of their Stripe dashboard, payouts, and dispute handling while EquiDuty collects platform fees.

**Onboarding flow**:
1. Org admin clicks "Connect Stripe" in settings
2. EquiDuty creates a Stripe Account Link (hosted onboarding)
3. Admin completes Stripe's hosted onboarding form
4. Stripe redirects back to EquiDuty with account status
5. EquiDuty stores account ID and monitors status

**Account status tracking**:
- `not_connected` → `pending` → `restricted` → `enabled`
- `restricted`: Stripe requires additional information before charges are enabled
- `enabled`: Charges and payouts both active
- `disabled`: Account deauthorized or suspended

**Type reference**: `OrganizationStripeSettings` in `shared/types/payment.ts` — already typed with all necessary fields (`stripeAccountId`, `accountStatus`, `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted`, `onboardingComplete`, etc.)

**Key behaviors**:
- Org can disconnect Stripe at any time (triggers `account.application.deauthorized` webhook)
- EquiDuty checks `chargesEnabled` before allowing payment creation
- Onboarding URL has expiry (`onboardingExpiresAt`) — regenerate if expired

#### 5.9.2 Invoice Payment Flow

EquiDuty invoices are the **source of truth** — we do NOT create Stripe Invoice objects. Instead, we use Stripe Checkout Sessions or Payment Intents to collect payment against EquiDuty invoices.

**One-time payment (Stripe Checkout)**:
1. Member clicks "Pay" on an invoice in the portal
2. EquiDuty creates a Stripe Checkout Session on the connected account with:
   - Line items mirroring the EquiDuty invoice
   - `payment_method_types: ['card', 'swish']` (based on org config)
   - `application_fee_amount` for platform revenue
   - `metadata: { organizationId, invoiceId, invoiceNumber }`
3. Member redirected to Stripe Checkout (selects card or Swish)
4. **Swish flow**: Stripe redirects to Swish app → member confirms → webhook confirms payment
5. **Card flow**: Member enters card details → immediate or 3DS confirmation → webhook
6. On `checkout.session.completed` webhook: update EquiDuty invoice status

**Saved card payment (Payment Intent)**:
1. Member selects a saved card and clicks "Pay"
2. EquiDuty creates a Payment Intent with:
   - `customer` (Stripe Customer ID)
   - `payment_method` (saved method ID)
   - `confirm: true` + `off_session: false`
   - `application_fee_amount` on connected account
   - `metadata: { organizationId, invoiceId, invoiceNumber }`
3. If 3DS required, redirect to authentication
4. On `payment_intent.succeeded` webhook: update EquiDuty invoice status

**Partial payments**:
- Supported when org enables `allowPartialPayments`
- Multiple payments against the same invoice tracked in `payments[]` array
- Invoice status: `partially_paid` until `amountPaid >= total`
- Each payment creates its own Checkout Session / Payment Intent

**Klippkort purchase**:
- Same Checkout Session flow as invoice payment
- Metadata includes `{ type: 'package_purchase', packageId, memberId }`
- On success: create MemberPackage + generate invoice

#### 5.9.3 Webhook Processing

Stripe webhooks are the backbone of payment status synchronization. EquiDuty handles both **platform events** and **connected account events**.

**Dual signature verification**:
- Platform webhook endpoint: verifies with platform webhook secret
- Connected account events: contain `account` field identifying the connected account
- Both use `stripeWebhookEvents` collection for idempotent processing (already exists in types)

**Processed events**:

| Event | Handler |
|---|---|
| `checkout.session.completed` | Update invoice to `paid`/`partially_paid`; record payment; create MemberPackage for klippkort |
| `payment_intent.succeeded` | Update invoice status; record payment; send confirmation email |
| `payment_intent.payment_failed` | Log failure; send failure email with retry link |
| `charge.refunded` | Update invoice `amountPaid`; create refund record; update status if fully refunded |
| `account.updated` | Update `OrganizationStripeSettings` status fields |
| `account.application.deauthorized` | Mark org Stripe as `disabled`; disable payment acceptance |

**Idempotent processing**:
- Each event stored in `stripeWebhookEvents/{stripeEventId}`
- Check `processed` flag before handling
- Retry with exponential backoff on transient failures
- `retryCount` tracked per event

#### 5.9.4 Saved Payment Methods

Members can save payment methods (cards) for faster future payments. Storage and PCI compliance handled entirely by Stripe — EquiDuty never sees raw card numbers.

**Flow**:
1. During Checkout Session, set `payment_intent_data.setup_future_usage: 'off_session'`
2. On successful payment, Stripe attaches the payment method to the Stripe Customer
3. EquiDuty creates/updates `StripeCustomer` record linking contact to Stripe customer
4. Saved methods stored in `savedPaymentMethods[]` on `StripeCustomer` (card brand, last4, expiry only)

**Type reference**: `StripeCustomer`, `SavedPaymentMethod` in `shared/types/payment.ts` — already fully typed.

**Management**:
- Member portal: list saved methods, set default, remove
- Remove: calls `stripe.paymentMethods.detach()` and updates local record
- Default method used for "Pay with saved card" flow

#### 5.9.5 Refunds

Org admin can issue full or partial refunds on paid invoices.

**Refund flow**:
1. Admin selects invoice → clicks "Refund" (full or specify amount)
2. EquiDuty calls `stripe.refunds.create()` on the connected account with:
   - `payment_intent` (from `PaymentIntent` record)
   - `amount` (in öre, omit for full refund)
   - `reason`: `requested_by_customer` / `duplicate` / `fraudulent` / `other`
3. On `charge.refunded` webhook: update `PaymentIntent.refunds[]` and `totalRefunded`
4. Update invoice: recalculate `amountPaid`, update `amountDue`, adjust status

**Credit note linkage (optional)**:
- Admin can create credit note + refund in one action
- Credit note references original invoice
- Refund amount matches credit note total

**Type reference**: `PaymentRefund`, `CreateRefundData` in `shared/types/payment.ts` — already typed.

#### 5.9.6 Receipts

**Online payments**:
- Stripe provides `receipt_url` on the Charge object
- Stored on `PaymentIntent.receiptUrl`
- Member can access receipt from invoice detail page in portal

**Manual payments**:
- Generated receipt PDF using existing `invoicePdf.ts` utility (adapted template)
- Stored in Firebase Storage with signed URL

**Invoice field**: `receiptUrl` on Invoice for quick access to latest receipt.

#### 5.9.7 Admin Toggles & Configuration

| Toggle | Options | Description |
|---|---|---|
| Payment mode | `manual_only` / `stripe_enabled` | Whether online payments are active |
| Accepted payment methods | `card`, `swish` (multi-select) | Which Stripe methods to offer |
| Auto-mark paid | On / Off | Auto-update invoice status on webhook |
| Allow partial payments | On / Off | Whether members can pay less than full amount |
| Application fee % | Number (platform-set) | Platform per-transaction fee via `application_fee_amount` |
| Pass fees to customer | On / Off | Whether Stripe processing fees are added to invoice total |
| Statement descriptor | String (max 22 chars) | Text appearing on member's bank statement |

### 5.10 Exports & Finance Integration (MVP3+)

#### Exports

| Export | Format | Contents |
|---|---|---|
| Invoice export | CSV | Invoice header fields, customer, amounts, VAT, dates |
| Line item export | CSV | All line items with mappings (accounting code, cost center, VAT) |
| Payment export | CSV | Payment records for reconciliation |
| SIE4 export | SIE | Swedish standard accounting export format |

#### Field Mappings

Org configures mapping between EquiDuty chargeable items and their accounting system:
- Accounting code (konto)
- Cost center (kostnadsställe)
- Project code
- VAT code

#### Future Connectors

- Fortnox API integration
- Bokio API integration
- Visma API integration

### 5.11 Invoice Email Delivery (MVP2)

Invoice and payment emails sent via existing SMTP/SendGrid infrastructure (`sendEmail()` in Cloud Functions).

#### Email Triggers

| Trigger | Template | Recipients |
|---|---|---|
| Invoice status → `sent` | Invoice summary + "Pay Now" button (portal URL) | Contact email (or billing contact for billing groups) |
| Reminder sent | Reminder notice + outstanding amount + "Pay Now" link | Contact email |
| `payment_intent.succeeded` | Payment confirmation with amount, method, receipt link | Contact email |
| `payment_intent.payment_failed` | Payment failure notice + retry link | Contact email |
| Credit note issued | Credit note summary + adjusted balance | Contact email |

#### Email Content

**Invoice email**:
- Organization name + logo (from invoice settings)
- Invoice number, issue date, due date
- Line item summary (top 5 items + "and X more")
- Total amount due (incl. VAT)
- "Pay Now" button → portal invoice detail page with payment options
- Payment terms text
- Organization contact information

**Payment confirmation email**:
- Amount paid, payment method (card ending •••1234 / Swish)
- Invoice number and remaining balance (if partial)
- Link to download receipt

#### Tracking Fields on Invoice

| Field | Type | Description |
|---|---|---|
| `emailSentAt` | Timestamp | When the invoice email was sent |
| `emailSentTo` | string | Email address it was sent to |
| `paymentConfirmationSentAt` | Timestamp | When payment confirmation was sent |

#### Audit Events

New `InvoiceEventAction` values: `email_sent`, `email_failed`, `payment_confirmation_sent`

### 5.12 Member Disputes (MVP2)

Members can raise disputes on specific line items or entire invoices. Disputes create a comment thread between the member and org admin, with structured resolution workflow.

#### Dispute Model

**Dispute** (stored in `disputes/{id}`):

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `organizationId` | string | Owning organization |
| `invoiceId` | string | Disputed invoice |
| `lineItemId` | string (optional) | Specific line item (null = whole invoice) |
| `memberId` | string | Member who raised the dispute |
| `memberName` | string | Denormalized |
| `status` | enum | `open` → `under_review` → `resolved` / `rejected` |
| `reason` | string | Free-text reason from member |
| `resolutionType` | enum (optional) | `credit_note_issued` / `line_item_adjusted` / `no_action` / `voided` |
| `resolutionNotes` | string (optional) | Admin's resolution explanation |
| `resolvedBy` | string (optional) | Admin who resolved |
| `resolvedAt` | Timestamp (optional) | When resolved |
| `creditNoteId` | string (optional) | If resolution created a credit note |
| `createdAt` | Timestamp | When dispute was raised |
| `updatedAt` | Timestamp | Last update |

**DisputeMessage** (stored in `disputes/{disputeId}/messages/{id}`):

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `disputeId` | string | Parent dispute |
| `authorId` | string | User who wrote the message |
| `authorName` | string | Denormalized |
| `authorRole` | enum | `member` / `admin` |
| `message` | string | Message text |
| `attachmentUrl` | string (optional) | Uploaded file reference |
| `createdAt` | Timestamp | When posted |

#### Status Flow

```
open → under_review → resolved
                    → rejected
```

- **open**: Member raised the dispute; admin not yet reviewing
- **under_review**: Admin acknowledged and investigating
- **resolved**: Admin resolved with one of the resolution types
- **rejected**: Admin determined the charge is correct (with explanation)

#### Resolution Types

| Type | Effect |
|---|---|
| `credit_note_issued` | Creates credit note referencing original invoice; adjusts balance |
| `line_item_adjusted` | Modifies the line item amount (on draft/pending invoices only) |
| `no_action` | Charge confirmed correct; dispute closed with explanation |
| `voided` | Invoice voided entirely (draft/pending only) |

#### Notifications

- Admin notified when new dispute is raised
- Member notified when dispute status changes
- Both parties notified on new messages in thread

---

## 6. Permissions & Roles (RBAC)

| Role | Capabilities |
|---|---|
| **Org Owner/Admin** | Full invoice/charges config, send, credits, exports, payment config, trainer compensation settings |
| **Org Billing Manager** (new role) | Invoice management, send, mark paid, reminders. No org settings access. |
| **Trainer** | Manage activities they run; view own billing summaries; no access to other invoice admin unless granted |
| **Member** | Read-only own invoices, pay (if enabled), dispute line items |
| **Billing Contact** | Read-only invoices for linked members, pay, download |
| **Platform Support** | Read-only access to troubleshoot (strict audit log; tenant isolation) |

---

## 7. Data Model (High-Level)

```
ChargeableItem             — Product/service catalog
├── PackageDefinition      — Klippkort / prepaid package template
│   └── MemberPackage      — Purchased package instance
├── LineItem               — Individual charge (with source reference + idempotency key)
│   └── PackageDeduction   — Links line item to package usage
├── BillingGroup           — Family/group billing relationships
├── Invoice                — Header + collection of line items
│   ├── CreditNote         — References original invoice (own number series)
│   ├── InvoiceStatusEvent — Audit trail (immutable subcollection)
│   └── Reminder           — Sent reminders log
├── Dispute                — Member-raised dispute on invoice/line item (MVP2)
│   └── DisputeMessage     — Conversation thread (subcollection) (MVP2)
├── Payment                — Internal payment record
│   └── ExternalPayment    — Stripe/Swish object IDs, webhook correlation
├── OrganizationStripeSettings — Stripe Connect config per org (MVP2, typed in payment.ts)
├── PaymentIntent          — Stripe Payment Intent / Checkout record (MVP2, typed in payment.ts)
├── StripeCustomer         — Links contact to Stripe customer + saved methods (MVP2, typed in payment.ts)
├── StripeWebhookEvent     — Idempotent webhook event log (MVP2, typed in payment.ts)
├── TrainerAttribution     — Activity → trainer mapping (Level 1)
│   └── TrainerCommission  — Calculated commission per period (MVP2, Level 2)
├── TrainerCommissionConfig — Commission rules per trainer per org (MVP2)
└── InvoiceNumberSeries    — Sequential number tracking per org + type
```

**MVP2 Additions (detail)**:

- **Dispute / DisputeMessage**: New collections. Dispute references invoice + optional line item. Messages are a subcollection for the comment thread.
- **TrainerCommissionConfig**: Defines commission percentage per trainer, per activity type, per org. Fields: `trainerId`, `organizationId`, `activityType`, `commissionPercent`, `effectiveFrom`, `effectiveTo`, `isActive`.
- **TrainerCommission**: Calculated commission for a period. Fields: `trainerId`, `organizationId`, `periodStart`, `periodEnd`, `totalRevenue`, `commissionRate`, `commissionAmount`, `status` (`pending` / `approved` / `exported` / `paid_externally`), `approvedBy`, `approvedAt`.
- **OrganizationStripeSettings**, **PaymentIntent**, **StripeCustomer**, **StripeWebhookEvent**: Already fully typed in `shared/types/payment.ts`.

### Key Design Decisions

- **All monetary amounts stored in öre** (integer, 1 SEK = 100 öre) to avoid floating-point errors
- **Immutable audit trail** for all invoice state transitions
- **Idempotency keys** on line items prevent double-billing
- **Sequential invoice numbers** enforced at database level (Firestore transaction)
- **Soft deletes** on catalog items (never hard delete referenced items)
- **Tenant isolation** — all queries scoped by `organizationId`

---

## 8. Non-Functional Requirements

| Requirement | Details |
|---|---|
| **Auditability** | Immutable event log for invoice state transitions. All admin actions logged. |
| **Reliability** | Invoicing runs must be resumable/idempotent. Stripe webhooks must be idempotent. |
| **Security** | Tenant isolation, least-privilege. Secure storage for exported files. PII handling per GDPR. |
| **Performance** | Handle batch runs for large orgs (thousands of line items). Invoice PDF generation < 5s. |
| **Compliance** | Swedish invoicing requirements (Bokföringslagen). VAT reporting support. GDPR data retention. |
| **Availability** | Payment webhook processing within 30s. Invoice delivery within 5 min of send action. |
| **Data integrity** | Monetary calculations in öre (integers). No floating-point arithmetic on money. |

---

## 9. MVP Scope Summary

### MVP1: Internal Invoicing + Packages + Family Billing

- Charge catalog (chargeable items with VAT rates)
- Prepaid packages (klippkort) — purchase, track, deduct
- Family/group billing — billing contacts, consolidated invoices
- Line items engine with source linking and idempotency
- Per-horse billing support
- Swedish-compliant invoice generation (sequential numbering, OCR, required fields)
- Credit notes (kreditfaktura) as separate document type
- Recurring invoice runs (monthly + term-based + custom)
- Invoice workflow: Draft → Review → Send (PDF/email) → Reminders → Paid/Overdue
- Manual "mark as paid" + overdue view
- Reminder system with configurable fees
- Basic export (CSV)
- Trainer attribution (Level 1 — read-only summaries)

### MVP2: Payments + Disputes + Commission

- Stripe Connect onboarding (Standard accounts) — org self-service
- Invoice payments: card + Swish via Stripe Checkout
- Saved payment methods (cards via Stripe, no PCI scope)
- One-time Checkout + saved card payment flows
- Application fee (platform per-transaction revenue via `application_fee_amount`)
- Invoice email delivery with "Pay Now" payment links
- Payment confirmation / failure emails
- Reminder emails with payment links
- Refund processing (full + partial, linked to credit notes)
- Member dispute flow (flag line item or invoice, comment thread, resolution workflow)
- Payment dashboard (collected, pending, failed, refunded amounts)
- Stripe fee transparency for org admin
- Receipts (Stripe `receipt_url` for online payments + generated PDF for manual)
- Partial payment support (multiple payments against one invoice)
- Automatic "paid" reconciliation via webhooks
- Trainer commission Level 2 (config per trainer, calculate per period, approval workflow)
- Trainer commission export (CSV)
- Klippkort online purchase from member portal via Stripe Checkout

### MVP3: Finance Integration + Settlement

- SIE4 export
- Rich CSV exports with configurable field mappings
- API connectors (Fortnox, Bokio, Visma)
- Autogiro (direct debit) for recurring fees
- Trainer full settlement via Stripe Connect (Level 3)
- E-invoicing (Peppol) — evaluation

---

## 10. User Stories

### A) Platform Provider (EquiDuty)

| # | Story | MVP |
|---|---|---|
| A1 | As the platform provider, I want invoicing, payments, exports, and klippkort to be feature-flagged per subscription tier so I can monetize advanced capabilities. | 1 |
| A2 | As the platform provider, I want to see an audit timeline for an invoice (created, sent, reminders, paid, credited) so I can support disputes quickly. | 1 |
| A3 | As the platform provider, I want Stripe webhook events to be idempotent and retryable so that payment states remain correct under failures. | 2 |
| A4 | As the platform provider, I want Stripe Connect onboarding for trainers to be self-service per org so I don't need manual setup. | 3 |
| A5 | As the platform provider, I want to collect an application fee on every payment via `application_fee_amount` so the platform generates per-transaction revenue. | 2 |
| A6 | As the platform provider, I want platform-level reporting on collected application fees across all orgs so I can track platform revenue. | 2 |
| A7 | As the platform provider, I want to monitor Stripe Connect onboarding status across orgs so I can identify and support stuck onboardings. | 2 |

### B) Organization Owner / Stable Admin

| # | Story | MVP |
|---|---|---|
| B1 | As an org admin, I want to define standard services (lesson fee, blanket change, arena fee) with VAT rate and accounting code so I can reuse them. | 1 |
| B2 | As an org admin, I want lesson attendance to auto-generate per-member line items (or deduct from klippkort) so I don't invoice manually. | 1 |
| B3 | As an org admin, I want to create prepaid packages (e.g., "10 jumping lessons") with optional expiry so members can buy bundles. | 1 |
| B4 | As an org admin, I want to link child-members to a parent as billing contact so the parent receives one consolidated invoice. | 1 |
| B5 | As an org admin, I want to run monthly invoices for base fees + extras, with review before sending, so billing is consistent. | 1 |
| B6 | As an org admin, I want different billing cadences (monthly for stall rent, term-based for lessons) because we invoice per period/term. | 1 |
| B7 | As an org admin, I want invoices to include organisationsnummer, momsreg.nr, OCR, bankgiro and comply with Swedish invoicing law. | 1 |
| B8 | As an org admin, I want to issue credit notes (kreditfaktura) that reference the original invoice and have their own number series. | 1 |
| B9 | As an org admin, I want configurable reminders with påminnelseavgift for overdue invoices. | 1 |
| B10 | As an org admin, I want to export invoice/payment data (CSV) so I can update my bookkeeping system. | 1 |
| B11 | As an org admin, I want to charge per horse so members with multiple horses get correct billing. | 1 |
| B12 | As an org admin, I want cancellation/no-show fees to auto-generate based on booking rules. | 1 |
| B13 | As an org admin, I want to enable Stripe + Swish payments so members can pay online. | 2 |
| B14 | As an org admin, I want to define commission % per trainer per activity type so the system calculates what I owe them. | 2 |
| B15 | As an org admin, I want to export in SIE4 format for my accountant. | 3 |
| B16 | As an org admin, I want to connect my organization's Stripe account via self-service onboarding so I can accept online payments. | 2 |
| B17 | As an org admin, I want a payment dashboard showing collected, pending, failed, and refunded amounts so I have a clear overview of cashflow. | 2 |
| B18 | As an org admin, I want invoices to be emailed to members with a "Pay Now" link so they can pay directly from the email. | 2 |
| B19 | As an org admin, I want reminder emails to include a payment link so members can pay immediately when reminded. | 2 |
| B20 | As an org admin, I want to see Stripe processing fees per payment so I understand the cost of online payments. | 2 |
| B21 | As an org admin, I want to review and resolve member disputes with a comment thread so issues are handled transparently. | 2 |
| B22 | As an org admin, I want to issue full or partial refunds via Stripe and optionally link them to credit notes. | 2 |
| B23 | As an org admin, I want to see failed payments and send retry notifications so I can recover unpaid invoices. | 2 |
| B24 | As an org admin, I want to view a trainer commission summary per period showing calculated amounts per trainer. | 2 |
| B25 | As an org admin, I want to approve calculated commissions before they are finalized so I can verify accuracy. | 2 |
| B26 | As an org admin, I want to toggle partial payments on/off per organization so I control payment flexibility. | 2 |
| B27 | As an org admin, I want to configure accepted payment methods (card and/or Swish) so I control which options members see. | 2 |

### C) Member / Customer

| # | Story | MVP |
|---|---|---|
| C1 | As a member, I want to see my invoice broken down by line item (what, when, why, which horse) so I trust the charges. | 1 |
| C2 | As a member, I want to see my klippkort balance and usage history. | 1 |
| C3 | As a member, I want to view/download past invoices so I can reconcile expenses. | 1 |
| C4 | As a member, I want to flag a line item and add a comment to resolve issues without endless texting. | 1 |
| C5 | As a member, I want to pay an invoice online (card/Swish) and see it marked as paid instantly. | 2 |
| C6 | As a member, I want to download payment receipts. | 2 |
| C7 | As a member, I want to save my card for future payments so I don't re-enter details each time. | 2 |
| C8 | As a member, I want to receive an email when an invoice is issued with a link to pay online. | 2 |
| C9 | As a member, I want to receive a confirmation email when my payment succeeds. | 2 |
| C10 | As a member, I want to track the status of disputes I've raised (open, under review, resolved, rejected). | 2 |
| C11 | As a member, I want to purchase klippkort packages from the member portal and pay via card or Swish. | 2 |

### D) Billing Contact (Parent/Guardian)

| # | Story | MVP |
|---|---|---|
| D1 | As a parent, I want to receive one invoice covering all my children's activities. | 1 |
| D2 | As a parent, I want the invoice to show charges grouped by child so I understand what each costs. | 1 |
| D3 | As a parent, I want to see klippkort balances for each of my children. | 1 |
| D4 | As a parent, I want to pay online for all my children's charges in one payment. | 2 |
| D5 | As a billing contact, I want to receive invoice and payment emails for the billing group so I stay informed. | 2 |
| D6 | As a billing contact, I want to save a payment method that can be used for all billing group payments. | 2 |

### E) Trainer (multi-org)

| # | Story | MVP |
|---|---|---|
| E1 | As a trainer, I want per-organization summaries of attendance and billable amounts so I can reconcile what I delivered. | 1 |
| E2 | As a trainer, I want the org admin to optionally allow me to create billable lesson entries without accessing finance settings. | 1 |
| E3 | As a trainer, I want to see my calculated commission per org per period. | 2 |
| E4 | As a trainer, I want to receive payouts directly to my bank account via the platform. | 3 |
| E5 | As a trainer, I want to export my commission data as CSV for my own bookkeeping. | 2 |
| E6 | As a trainer, I want to see the approval status of my commissions (pending, approved, exported) so I know when to expect payment. | 2 |

---

## 11. SWOT Analysis

### Strengths

- **Stable-native billing**: Ties charges directly to activities/bookings/services instead of generic accounting workflows
- **Klippkort support**: Solves a real pain point that generic tools ignore
- **Family billing**: Handles the common parent-pays-for-children scenario natively
- **Line-item clarity** reduces disputes around "included vs extra" services
- **Swedish compliance built-in**: OCR, sequential numbering, kreditfaktura, VAT handling
- **Recurring cadences** match real-world patterns (monthly + term/period billing)
- **Tiered trainer compensation**: Orgs can start simple and grow into full settlement

### Weaknesses

- **Regulatory complexity**: VAT splits and Swedish invoicing norms expand scope
- **Support load risk**: Disputes may increase; needs guardrails (workflow, logs, templates)
- **Payment handling expectations** rise with Stripe (chargebacks, failed payments, reconciliation)
- **Klippkort edge cases**: Expiry, refunds, transfers between family members add complexity
- **Stripe Connect complexity**: Full trainer settlement requires significant Stripe integration work

### Opportunities

- **Differentiation vs generic tools** (Fortnox/Bokio): become the operational system of record while accounting tools remain the ledger
- **Add-on marketplace**: Standardized service catalog templates (common stable services, lesson types)
- **Expansion to finance integrations**: CSV/SIE exports first, then API connectors for high-retention orgs
- **Swish integration** gives instant Swedish market fit for payments
- **Family billing** is a compelling feature for riding schools (large share of customers are minors)

### Threats

- Established vertical competitors in riding-school admin + billing
- Feature parity pressure: e-invoicing expectations, reminder workflows, debt collection
- Payment provider dependency on Stripe (mitigate with abstraction layer)
- Accounting regulation changes requiring rapid adaptation

---

## 12. Key Product Decisions

1. **Swedish compliance from MVP1** — invoicing law requirements are non-negotiable before go-live
2. **Klippkort + family billing in MVP1** — these are table-stakes for Swedish riding schools
3. **All monetary values in öre (integer)** — no floating-point money arithmetic
4. **Source-linked line items as the center** — every line item references activity/booking/manual for explainability
5. **VAT/tax category per line item from day one** — mixed VAT rates are common in horse businesses
6. **Design an "Accounting Adapter" interface early** — even if CSV-only in MVP1, so MVP3 integrations don't force refactors
7. **Trainer compensation is tiered** — attribution (MVP1) → commission (MVP2) → settlement (MVP3), org chooses level
8. **Stripe + Swish** — Swish is essential for Swedish market. Stripe supports it natively.
9. **Credit notes are first-class documents** — not negative invoices, but proper kreditfaktura with own number series
10. **Sequential invoice numbering enforced at database level** — Firestore transactions to guarantee no gaps

---

## 13. Resolved & Open Questions

### Resolved

| # | Question | Resolution |
|---|---|---|
| R1 | Should klippkort be transferable between family members within a billing group? | **Yes** — transferable within billing group. Any member in the same billing group can use sessions. Controlled via `transferableWithinGroup` flag on PackageDefinition. |
| R2 | How to handle mid-term cancellations for prepaid packages? | **Org-configurable policy per package**: `no_refund`, `pro_rata_unit`, `pro_rata_package`, or `full_refund`. Set via `cancellationPolicy` field on PackageDefinition. |
| R3 | Should we support öresavrundning on invoices? | **Yes, mandatory.** All invoice totals rounded to nearest whole SEK. `roundingAmount` field tracks the rounding adjustment. |
| R4 | Should billing groups support non-family relationships? | **Yes, from MVP1.** Billing groups are generic — support `parent`, `guardian`, `company`, `sponsor`, and `other` relationship types. |
| R5 | What is the maximum invoice batch size we need to support? | **Design target: 5,000 line items per run.** Cloud Function with chunked processing and idempotent resumption. |
| R6 | Do we need to support mixed payment methods on a single invoice? | **No.** Each Stripe Checkout Session uses one method. Multiple partial payments from different methods are naturally supported (member pays part with card, part with Swish in separate sessions). |
| R7 | Stripe Connect account type for organizations? | **Standard accounts.** Orgs get full Stripe dashboard control, handle their own disputes, manage payouts. Platform collects fees via `application_fee_amount`. |
| R8 | Swish integration approach? | **Stripe's native Swish support only.** No direct Swish API integration. Simplifies implementation and keeps all payment processing within Stripe. |

### Open

| # | Question | Impact | Decision needed by |
|---|---|---|---|
| 3 | Stripe Connect account type for trainers (Level 3): Standard vs Express? | Onboarding UX vs. control | MVP3 design |
| 4 | Should trainer commission retroactively adjust when credit notes are issued on invoices that contributed to commission calculations? | Commission accuracy vs. complexity | MVP2 design |
| 5 | Should Klarna be offered as a payment method alongside card and Swish? | Payment flexibility | Proposed: not in MVP2, evaluate for MVP3 |
| 6 | Should we support auto-charging a saved card when an invoice is sent (opt-in per member)? | Reduces friction but requires clear consent | Proposed: defer to MVP3 |

---

## 14. Success Metrics

| Metric | Target | Timeframe |
|---|---|---|
| Orgs using invoicing module | 20+ | 3 months post-MVP1 |
| Invoices generated per month | 500+ | 3 months post-MVP1 |
| Dispute rate | < 5% of line items | Ongoing |
| Payment collection rate (MVP2) | > 85% paid within terms | 3 months post-MVP2 |
| Avg time from invoice to payment (MVP2) | < 10 days | 6 months post-MVP2 |
| Klippkort adoption | > 30% of riding school orgs | 6 months post-MVP1 |
| Family billing adoption | > 40% of riding school orgs | 6 months post-MVP1 |

---

## 15. Dependencies

| Dependency | Status | Impact |
|---|---|---|
| Activity/lesson module | Implemented | Source for activity-based line items |
| Booking module | Implemented | Source for booking-based line items |
| Membership/subscription system | Implemented | Source for recurring charges |
| Horse management | Implemented | Per-horse billing references |
| Stripe account (platform) | Existing | MVP2 payments — Stripe Connect (Standard accounts) for org onboarding |
| Email infrastructure (SMTP/SendGrid) | Existing | Invoice + payment notification emails (send, confirm, fail, remind) |
| PDF generation library | Implemented | `api/utils/invoicePdf.ts` — HTML-based PDF rendering |
| OCR number generation | Implemented | `shared/utils/ocr.ts` — Luhn algorithm |
| Swish via Stripe | Available | Verify Stripe Swish support in current plan |

---

## 16. Implementation Status (MVP1)

**Last reviewed**: 2026-02-01

### MVP1 Feature Implementation

| Feature | Status | Files | Notes |
|---|---|---|---|
| Charge catalog (chargeable items CRUD) | ✅ Implemented | `api/routes/chargeableItems.ts`, `frontend/pages/ChargeableItemsPage.tsx` | Full CRUD with categories, unit types, VAT rates, accounting codes |
| Prepaid packages (klippkort) | ✅ Implemented | `api/routes/packages.ts`, `frontend/pages/PackagesPage.tsx`, `api/utils/packageDeduction.ts` | Purchase, deduct, cancel, expiry policies, transferable within billing group |
| Billing groups | ✅ Implemented | `api/routes/billingGroups.ts`, `frontend/pages/BillingGroupsPage.tsx` | Family, company, sponsor, custom relationship types |
| Line items engine | ✅ Implemented | `api/routes/lineItems.ts`, `frontend/pages/LineItemsPage.tsx`, `api/utils/lineItemGenerator.ts` | Source linking, idempotency keys, generate-invoices endpoint |
| Sequential invoice numbering | ✅ Implemented | `api/routes/invoices.ts` | Gap-free via Firestore transactions, separate series for credit notes |
| OCR number generation | ✅ Implemented | `shared/utils/ocr.ts` | Luhn algorithm, shared utility (deduplicated from inline) |
| Öresavrundning | ✅ Implemented | `shared/utils/money.ts` | Rounding to whole SEK with roundingAmount tracking |
| Credit notes (kreditfaktura) | ✅ Implemented | `api/routes/invoices.ts` | Separate number series, references original invoice |
| Invoice audit trail | ✅ Implemented | `api/utils/invoiceAudit.ts` | statusEvents subcollection, immutable event log |
| Recurring billing | ✅ Implemented | `functions/scheduled/recurringBilling.ts` | Cloud Function, daily at 02:00, monthly + custom cadence, idempotent |
| Invoice reminders + påminnelseavgift | ✅ Implemented | `functions/scheduled/invoiceReminders.ts` | Configurable fee, description, thresholds per org; linear progression for 3+ reminders |
| Overdue status updater | ✅ Implemented | `functions/scheduled/invoiceReminders.ts` | Daily at 06:00, marks sent invoices past due date as overdue |
| Trainer attribution (Level 1) | ✅ Implemented | `api/routes/trainerAttribution.ts` | Read-only per-org summary |
| CSV export | ✅ Implemented | `api/routes/exports.ts` | Invoices, line items, payments export |
| Invoice PDF generation | ✅ Implemented | `api/utils/invoicePdf.ts` | HTML-based PDF rendering |
| Invoice settings (per org) | ✅ Implemented | `api/routes/invoiceSettings.ts` | Payment terms, reminder config, billing cadence, org details |
| Per-horse billing (horseId) | ✅ Implemented | `api/routes/lineItems.ts` | `horseId` field on line items for per-horse charges |
| VAT summary by rate | ✅ Implemented | `api/routes/invoices.ts` | `vatBreakdown` array grouped by VAT rate on invoice creation |
| Customer address on invoice | ✅ Implemented | `api/routes/invoices.ts` | Denormalized from contact on invoice creation |
| Firestore security rules | ✅ Implemented | `firestore.rules` | Rules for all new collections |
| Module access gating | ✅ Implemented | `api/middleware/checkModuleAccess.ts` | Feature-flag invoicing per subscription tier |
| Frontend i18n (sv/en) | ✅ Implemented | `frontend/public/locales/{sv,en}/invoices.json` | All 4 pages fully internationalized |

### MVP1 Gaps (Known, Deferred)

| Feature | Status | PRD Reference | Notes |
|---|---|---|---|
| Member dispute flow | ✅ Resolved in MVP2 | UC7, C4 | Full dispute CRUD, message thread, resolution workflow implemented |
| Cancellation/no-show auto-fees | ⚠️ Partial | UC8, B12 | Line item source types `cancellation_fee` and `no_show_fee` exist, but no automatic generation from booking rules. Manual creation only. |
| `paymentTermsDays` as numeric | ⚠️ Minor deviation | §5.3 | Stored as `paymentTerms` (string, e.g., "30 dagar netto") rather than numeric days. Functionally equivalent for display. |
| Email delivery of invoices | ✅ Resolved in MVP2 | UC6 | Full email delivery with HTML templates, "Pay Now" links, payment confirmation/failure emails, idempotent sending |
| Billing cadence: term-based | ⚠️ Partial | B6 | Monthly cadence fully works. Custom interval (days) supported. True term-based (hösttermin/vårtermin) not yet calendar-aware. |

### Code Quality Review (Completed 2026-02-01)

The following code quality improvements were applied across the MVP1 codebase:

#### Security Fixes

| Fix | Severity | Details |
|---|---|---|
| `checkModuleAccess` fail-closed | Critical | Catch block changed from silently allowing requests to returning 500 error. Prevents unauthorized access on Firestore errors. |
| Invoice enumeration prevention | Medium | `GET /invoices/:id` now returns uniform 404 for both "not found" and "not authorized" to prevent ID enumeration. |
| Org-scoped query verification | Medium | All Firestore queries verified to include `organizationId` scoping from URL params (not request body). |

#### Code Deduplication

| Change | Files affected |
|---|---|
| OCR generation consolidated | Removed inline `generateOCRNumber()` from `invoices.ts`, now imports `generateOCR()` from `@equiduty/shared` |
| Money formatting consolidated | `invoiceService.formatCurrency()` delegates to shared `formatOre()` utility |
| Reminder fee description configurable | `invoiceReminders.ts` reads `reminderFeeDescription` from org settings instead of hardcoded Swedish text |

#### i18n Compliance

| Change | Scope |
|---|---|
| Translation keys added | ~200 keys added to `sv/invoices.json` and `en/invoices.json` covering chargeableItems, billingGroups, packages, lineItems sections |
| ChargeableItemsPage.tsx | ~58 hardcoded strings replaced with `t()` calls |
| BillingGroupsPage.tsx | ~44 hardcoded strings replaced with `t()` calls, Swedish encoding errors fixed |
| PackagesPage.tsx | ~59 hardcoded strings replaced with `t()` calls, Swedish encoding errors fixed |
| LineItemsPage.tsx | ~55 hardcoded strings replaced with `t()` calls, Unicode escapes replaced with UTF-8 |

#### Swedish Character Encoding Fixes

All broken Swedish characters in generated code were corrected:
- `Foralder` → `Förälder`, `Foretag` → `Företag`, `Ovrigt` → `Övrigt`
- `Forfall` → `Förfall`, `Overforing` → `Överföring`, `aterbetalning` → `återbetalning`
- `Utganget` → `Utgånget`, `Forbrukat` → `Förbrukat`, `Aterbetalt` → `Återbetalt`
- `kopra` → `köpta`, `annu` → `ännu`, `Sok` → `Sök`, `Valj` → `Välj`

---

## 17. Implementation Status (MVP2)

**Last reviewed**: 2026-02-01
**Status**: ✅ Implementation complete — Security hardened

### MVP2 Feature Implementation

| Feature | Status | Files | Notes |
|---|---|---|---|
| Stripe Connect onboarding | ✅ Implemented | `api/utils/stripeConnect.ts`, `api/routes/payments.ts`, `frontend/pages/PaymentSettingsPage.tsx` | Standard accounts, self-service onboarding flow, TOCTOU-safe account creation via Firestore transaction |
| Invoice payment (Checkout Sessions) | ✅ Implemented | `api/routes/payments.ts`, `api/utils/stripePayments.ts`, `frontend/pages/InvoicePayPage.tsx` | Card + Swish via Stripe Checkout, org-scoped session creation |
| Saved payment methods | ✅ Implemented | `api/routes/payments.ts`, `api/utils/stripePayments.ts` | Stripe Customer creation (TOCTOU-safe via transaction), card storage, admin-only deletion |
| Payment Intent (saved card) | ✅ Implemented | `api/routes/payments.ts` | Pay with existing saved method, 3DS support |
| Webhook processing (payment events) | ✅ Implemented | `api/routes/stripe-webhooks.ts` | Dual endpoint (platform + connected), transactional idempotency claiming, all handlers atomic |
| Invoice email delivery | ✅ Implemented | `functions/triggers/onInvoiceStatusChange.ts`, `functions/emails/sendInvoiceEmail.ts`, `functions/emails/invoiceEmailTemplates.ts` | HTML templates with "Pay Now" link, idempotent per-transition guard |
| Payment confirmation email | ✅ Implemented | `functions/emails/sendInvoiceEmail.ts` | Triggered on successful payment, includes receipt link |
| Payment failure email | ✅ Implemented | `functions/emails/sendInvoiceEmail.ts` | Retry link on failure, idempotency guard (60s dedup) |
| Reminder emails with payment link | ✅ Implemented | `functions/scheduled/dailyInvoiceProcessing.ts` | Extends existing reminder system, cursor-based pagination for >500 orgs |
| Refund processing | ✅ Implemented | `api/utils/stripeRefunds.ts`, `frontend/components/invoices/RefundDialog.tsx` | Full + partial, atomic `totalRefunded` with over-refund guard, atomic `amountPaid` decrement, compensating action on Firestore failure |
| Member dispute flow | ✅ Implemented | `api/routes/disputes.ts`, `frontend/pages/DisputesPage.tsx`, `frontend/components/invoices/DisputePanel.tsx`, `frontend/components/disputes/DisputeDetailView.tsx`, `frontend/components/disputes/DisputeResolutionDialog.tsx` | Full CRUD + resolution workflow, message thread, shared components between page and panel views |
| Payment dashboard | ✅ Implemented | `frontend/pages/PaymentDashboardPage.tsx`, `frontend/services/paymentDashboardService.ts` | Collected, pending, failed, refunded overview with properly typed dashboard data |
| Stripe fee transparency | ✅ Implemented | `frontend/pages/PaymentDashboardPage.tsx` | Processing fees visible per payment in dashboard |
| Receipt access | ✅ Implemented | `api/utils/receiptGenerator.ts`, `api/routes/payments.ts` | Stripe `receipt_url` for online payments + generated PDF for manual |
| Partial payment support | ✅ Implemented | `api/routes/payments.ts`, `api/routes/stripe-webhooks.ts` | Multiple payments against one invoice, atomic amountPaid tracking |
| Application fee collection | ✅ Implemented | `api/routes/payments.ts` | `application_fee_amount` on connected account charges |
| Trainer commission config (Level 2) | ✅ Implemented | `api/routes/trainerCommission.ts`, `frontend/components/trainerCommission/CommissionConfigPanel.tsx` | Commission % per trainer per activity type, Zod-validated POST/PUT, admin-only access |
| Trainer commission calculation | ✅ Implemented | `api/utils/commissionCalculator.ts`, `frontend/components/trainerCommission/CommissionCalculateDialog.tsx` | Calculate per period from attribution data, fixed_amount skip min/max, correct field mapping |
| Commission approval workflow | ✅ Implemented | `api/routes/trainerCommission.ts`, `frontend/components/trainerCommission/CommissionApprovalDialog.tsx` | Admin approve/reject, Zod-validated bodies |
| Commission CSV export | ✅ Implemented | `api/routes/exports.ts`, `frontend/components/trainerCommission/CommissionExportButton.tsx` | Admin-only export (requires `canManageOrganization`) |
| Klippkort online purchase | ✅ Implemented | `api/routes/payments.ts`, `frontend/pages/portal/PackagePurchasePage.tsx` | Checkout Session for package purchase from member portal |
| Payment method management (portal) | ✅ Implemented | `api/routes/payments.ts`, `frontend/pages/PaymentSettingsPage.tsx` | Add, remove (admin-only), set default; admin/owner role check on deletion |
| Portal payments | ✅ Implemented | `api/routes/portalPayments.ts`, `frontend/pages/portal/PortalPaymentPage.tsx` | Member payment history with bounded query limits (max 100, default 20) |
| Payment success/cancel pages | ✅ Implemented | `frontend/pages/PaymentSuccessPage.tsx`, `frontend/pages/PaymentCancelPage.tsx` | Post-Checkout redirect handling |
| Firestore security rules (MVP2) | ✅ Implemented | `firestore.rules` | Rules for disputes (org-scoped + creator), invoices (contactId field fix), lineItems (org membership), stripeCustomers, checkoutSessions, paymentIntents, webhookEvents, commissions |
| Frontend i18n for MVP2 pages | ✅ Implemented | `frontend/public/locales/{sv,en}/{payments,disputes,trainerCommission}.json` | All MVP2 pages fully internationalized |
| Module access gating | ✅ Implemented | `api/middleware/checkModuleAccess.ts` | Returns 400 when orgId missing, reads only from URL params (not body) |

### MVP2 Type Status

| Type | Status | File |
|---|---|---|
| `OrganizationStripeSettings` | ✅ Typed | `shared/types/payment.ts` |
| `PaymentIntent` | ✅ Typed | `shared/types/payment.ts` |
| `PaymentRefund` | ✅ Typed | `shared/types/payment.ts` |
| `StripeCustomer` | ✅ Typed | `shared/types/payment.ts` |
| `SavedPaymentMethod` | ✅ Typed | `shared/types/payment.ts` |
| `StripeWebhookEvent` | ✅ Typed | `shared/types/payment.ts` |
| `CheckoutSession` | ✅ Typed | `shared/types/payment.ts` |
| `CreateCheckoutSessionData` | ✅ Typed | `shared/types/payment.ts` |
| `CreateRefundData` | ✅ Typed | `shared/types/payment.ts` |
| `TrainerAttribution` | ✅ Typed | `shared/types/trainerAttribution.ts` |
| `Dispute` | ✅ Typed | `shared/types/dispute.ts` |
| `DisputeMessage` | ✅ Typed | `shared/types/dispute.ts` |
| `DisputeAttachment` | ✅ Typed | `shared/types/dispute.ts` |
| `CreateDisputeData` | ✅ Typed | `shared/types/dispute.ts` |
| `ResolveDisputeData` | ✅ Typed | `shared/types/dispute.ts` |
| `CreateDisputeMessageData` | ✅ Typed | `shared/types/dispute.ts` |
| `TrainerCommissionConfig` | ✅ Typed | `shared/types/trainerCommission.ts` |
| `TrainerCommission` | ✅ Typed | `shared/types/trainerCommission.ts` |

### MVP2 Code Quality Review (Completed 2026-02-01)

A comprehensive post-implementation audit identified and fixed 48 issues across security, data integrity, and code quality.

#### Critical Security Fixes

| Fix | Severity | Details |
|---|---|---|
| Checkout session org-scoping | Critical | GET endpoint now verifies session `organizationId` matches URL param; prevents cross-tenant data access |
| Payment method deletion auth | Critical | Only org owners/admins can delete payment methods; was accessible to any org member |
| Prepaid deposit auth | Critical | Deposit to contact prepaid requires `canManageOrganization`; was accessible to any org member |
| Invoice creation org-scoping | Critical | Uses `req.params.orgId` instead of body field; prevents org spoofing |
| Invoice status injection | Critical | Status always defaults to `draft`; body `status` field stripped to prevent attackers setting `paid` |
| Export authorization | Critical | Financial exports require `canManageOrganization` (was `canAccessOrganization` — any member) |
| Module access bypass | Critical | `checkModuleAccess` returns 400 when orgId missing (was silently passing); only reads from URL params |
| Disputes IDOR | Critical | Firestore rules scoped to org members + dispute creator; was readable by any authenticated user |
| Invoice field mismatch | Critical | Firestore rules `customerId` → `contactId` alignment with actual document schema |
| LineItems auth fix | Critical | Firestore rules use org membership check instead of incorrect UID match on `billingContactId` |
| Commission data access | High | Commission/attribution GET routes restricted to admins + own trainer |
| Invoice payment 403→404 | High | Returns 404 for both "not found" and "not authorized" to prevent invoice enumeration |
| Portal query bounds | High | Query limit validated (max 100, default 20) to prevent unbounded queries |

#### Race Condition Fixes (Financial Data Integrity)

| Fix | Severity | Details |
|---|---|---|
| Refund `totalRefunded` atomic | Critical | `FieldValue.increment()` inside Firestore transaction with over-refund guard |
| Invoice `amountPaid` atomic | Critical | Transaction with `FieldValue.increment(-refundAmount)` and balance validation |
| Webhook idempotency | Critical | Transactional event claiming — concurrent webhook retries cannot double-count payments |
| Stripe Connect TOCTOU | Critical | Account creation wrapped in Firestore transaction to prevent duplicate Stripe accounts |
| Stripe Customer TOCTOU | Critical | Customer creation uses deterministic doc ID + transaction to prevent duplicates |
| Line item idempotency | Critical | New `lineItemIdempotency` collection with transactional read-check-write |

#### Backend Quality Fixes

| Fix | Severity | Details |
|---|---|---|
| Zod validation (commission) | High | All POST/PUT routes on `trainerCommission.ts` validated with Zod schemas |
| Zod validation (attribution) | High | POST route on `trainerAttribution.ts` validated with Zod schema |
| Commission calculator field fix | High | `studentName` was incorrectly mapped to `attr.trainerName` |
| Commission min/max fix | High | min/max clamp skipped for `fixed_amount` rate type |
| Invoice status change idempotency | High | Per-transition `emailSentForTransition` map prevents duplicate emails on Cloud Function retries |
| Email send idempotency | High | Check+set `lastEmailTypeSent` with 60s dedup window |
| Reminder pagination | Medium | Cursor-based pagination for >500 orgs in daily reminder processing |
| Stripe error narrowing | Medium | `instanceof Stripe.errors.StripeError` for structured error logging |
| Refund reconciliation | Medium | `failedRefundReconciliation` collection for Stripe/Firestore mismatch recovery |

#### Frontend Refactoring

| Change | Scope | Details |
|---|---|---|
| Page splitting | 5 pages | TrainerCommissionPage (1190→467 lines), LineItemsPage (828→398), PackagesPage (825→261), ChargeableItemsPage (753→282), DisputePanel+DisputesPage (1274→784 combined) |
| Extracted components | ~20 new | CommissionConfigPanel, CommissionListTable, CommissionApprovalDialog, CommissionCalculateDialog, CommissionExportButton, LineItemFilters, LineItemTable, LineItemFormDialog, PackageTable, PackageFormDialog, ChargeableItemTable, ChargeableItemFormDialog, DisputeDetailView, DisputeResolutionDialog, CrudPageLayout |
| Shared hooks | 1 new | `useRequireOrganization` — replaces duplicated "no org selected" guard across 7 pages |
| Money formatting | 13 files | Consolidated duplicate `formatCurrency`/`formatSEK` to single `formatOre` utility |
| Query keys centralized | `queryClient.ts` | `queryKeys` factory object; all MVP2 pages use centralized keys |
| Cache invalidation | Multiple | Scoped invalidation (RefundDialog no longer invalidates all queries), centralized helpers |
| Delete confirmations | 3 pages | AlertDialog added before destructive operations (BillingGroups, LineItems, ChargeableItems) |
| TypeScript cleanup | PaymentDashboardPage | 4 `as any` casts removed with proper type definitions |
| Timestamp safety | Multiple | Consistent `toDate()` guard utility for Firestore Timestamp handling |
| useCallback stability | 6 pages | Array deps replaced with centralized queryKeys to prevent unnecessary re-renders |
| i18n completion | PaymentSettingsPage | All hardcoded English strings moved to `payments.json` locale files |

### New Firestore Collections (MVP2)

| Collection | Purpose | Security |
|---|---|---|
| `disputes/{id}` | Invoice disputes | Org members + dispute creator read; backend-only writes |
| `disputes/{id}/messages/{id}` | Dispute message thread | Org admins read; backend-only writes |
| `stripeCustomers/{id}` | Contact → Stripe customer mapping | Org admins read; backend-only writes |
| `stripeWebhookEvents/{id}` | Idempotent webhook event log | No client access |
| `checkoutSessions/{id}` | Stripe Checkout session records | Org admins read; backend-only writes |
| `trainerCommissionConfigs/{id}` | Commission rules per trainer | Org admins read; backend-only writes |
| `trainerCommissions/{id}` | Calculated commission records | Org admins + own trainer read; backend-only writes |
| `lineItemIdempotency/{key}` | Line item deduplication | Backend-only (no client access) |
| `failedRefundReconciliation/{id}` | Recovery records for Stripe/Firestore mismatches | Backend-only (no client access) |
