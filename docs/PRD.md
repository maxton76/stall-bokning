# Product Requirements Document (PRD)
## Stable Booking System

---

## 📋 Document Information

| **Attribute** | **Value** |
|--------------|-----------|
| **Version** | 1.0 |
| **Date** | 2025-12-25 |
| **Status** | Draft |
| **Author** | Product Team |
| **Last Updated** | 2025-12-25 |

---

## 🎯 Executive Summary

**Product Name**: Stable Booking System (TBD)

**Vision**: A SaaS platform that helps stable owners and boarders fairly distribute and manage daily chores through an intelligent, weight-based booking system.

**Problem**: Stable boarders share daily chores (morning, lunch, afternoon, and evening shifts), but shifts have different weights and complexity. Today, there is no digital tool to ensure fair distribution over time, leading to conflicts and uneven workload.

**Solution**: A web-based platform where:
- Stable owners/administrators configure weighted shift types and create standard schedules
- The system suggests fair distribution based on point weighting
- Boarders can book, swap, and manage their shifts
- Automatic reminders via email/SMS/Telegram
- Comprehensive statistics and reporting for all user types

**Business Model**: Freemium with tiered model and premium services

---

## 🔍 Problem Statement

### Current Situation
Stables today use manual methods (Excel, Google Sheets, WhatsApp groups) to coordinate daily chores. This leads to:

1. **Unfair Distribution**: Certain boarders systematically get heavier shifts
2. **Administrative Burden**: Stable owners spend too much time on scheduling
3. **Missed Shifts**: Lack of reminders leads to forgotten shifts
4. **Conflicts**: No objective measurement of who has contributed most/least
5. **Fragmented Communication**: Information is spread across different channels

### Target Audience
- **Primary**: Stable owners with 5-50 boarders
- **Secondary**: Boarders who want transparent and fair shift distribution
- **Tertiary**: System administrators who operate the SaaS platform

### Market Potential
- Sweden has approximately 360,000 horses and thousands of riding facilities
- Target market: Private boarding stables with shared responsibility for daily chores
- Expansion: Nordic market, then Europe

---

## 🎯 Goals & Objectives

### Business Goals
1. **Q2 2026 Launch**: MVP in production with at least 5 paying stable owners
2. **Retention**: >80% monthly retention after first quarter
3. **Revenue**: Reach 50,000 SEK MRR (Monthly Recurring Revenue) within 12 months
4. **Expansion**: Support at least 100 stables within 18 months

### Product Goals
1. **User Experience**: Intuitive shift booking in <30 seconds
2. **Fairness**: 90% of boarders experience distribution as fair (NPS >50)
3. **Reliability**: 99.5% uptime
4. **Performance**: Page load <2 seconds

### Success Metrics
| **Metric** | **Target (Q2 2026)** | **Measurement** |
|------------|----------------------|-----------------|
| Active Stables | 10 | Backend analytics |
| Total Boarders | 200+ | User database count |
| Daily Active Users (DAU) | 30% | Login analytics |
| NPS Score | >50 | Quarterly survey |
| Churn Rate | <10%/month | Subscription analytics |

---

## 👥 User Personas

### Persona 1: System Administrator (Platform Owner)
**Name**: Erik, 35
**Role**: Platform Owner/Support
**Goals**:
- Manage all stable owners and their subscriptions
- Gain insight into platform usage and engagement
- Resolve support tickets quickly
- Optimize business model based on data

**Pain Points**:
- Difficult to get overview of all stables
- Need to help customers without logging in as them
- Want to understand which features are used/not used

**Needs**:
- Admin panel with full overview
- Read-only access to stables for support
- Aggregated statistics (usage, engagement, churn)
- Payment and subscription management

---

### Persona 2: Stable Owner/Stable Administrator (Customer)
**Name**: Maria, 42
**Role**: Stable owner with 15 boarders
**Goals**:
- Minimize time on administrative work
- Ensure all chores get done
- Reduce conflicts around shift distribution
- Retain satisfied boarders

**Pain Points**:
- Spends 5-10 hours/month on scheduling
- Receives complaints about unfair distribution
- Difficult to find substitutes when someone is sick
- No good overview of who does what

**Needs**:
- Automatic distribution with ability to adjust
- Clear statistics on activity per boarder
- Notifications when shifts are unstaffed
- Flexible shift types (time + chore + weighting)

---

### Persona 3: Stable Boarder (End User)
**Name**: Anna, 28
**Role**: Boarder with one horse
**Goals**:
- Know exactly which shifts she has
- Easily swap shifts when needed
- Feel that distribution is fair
- Not miss her shifts

**Pain Points**:
- Forgets shifts (no reminder)
- Feels that some always get easier shifts
- Difficult to swap shifts with others
- No overview of her contribution

**Needs**:
- Reminders via email/SMS
- Simple swap function
- Transparent history of own shifts
- Ability to comment/communicate about shifts

---

## ⚙️ Functional Requirements

### 1. User Management & Permissions

#### 1.1 System Administrator (Platform Admin)
**Permissions**:
- Create, edit, and delete stable owners
- Manage subscriptions and payments
- System configuration (global settings)
- Support tickets and read-only access to all stables
- Display aggregated platform statistics

**User Stories**:
- As system admin I want to see all active stable owners in a list so I have overview
- As system admin I want to log in with read-only view to a stable to help customers with support
- As system admin I want to see usage statistics (logins, bookings, churn) to optimize the product

#### 1.2 Stable Owner/Stable Administrator (Stall Owner)
**Roles**:
1. **Main Administrator**: Full control over stable
   - Add/remove boarders
   - Manage all settings
   - Create and publish schedule
   - See all statistics

2. **Co-Administrator**: Limited rights
   - Edit schedule
   - See statistics
   - NOT remove boarders

3. **Schedule Manager**: Only schedule management
   - Create and publish schedule
   - Manage shift types
   - NOT change boarders or settings

**User Stories**:
- As stable owner I want to invite new boarders via email
- As stable owner I want to approve/deny applications from boarders seeking my stable
- As stable owner I want to assign different roles to my administrators
- As stable owner I want to mark boarders with status (active/vacation/absent/inactive) so distribution is correct

#### 1.3 Stable Boarder (End User)
**Functions**:
- Search for stables (by name/location)
- Request membership in stable (requires approval)
- Manage profile:
  - Contact information (email, phone)
  - Horse information (number of horses, names)
  - Notification settings
- Specify availability (optional):
  - "Never available Mondays 06-09"
  - "Only weekends"
  - "Max 2 shifts/week"

**User Stories**:
- As boarder I want to search for my stable and request membership
- As boarder I want to specify my general availability so the system can suggest suitable shifts
- As boarder I want to update my profile with horse information

---

### 2. Scheduling & Booking System

#### 2.1 Shift Types & Weighting
**Configuration of shift types**:
- Stable owner defines custom shift types with:
  - **Time**: Start and end time (e.g., 06:00-09:00)
  - **Chore**: Type of work (e.g., "Stable cleaning", "Feeding", "Turnout")
  - **Weighting**: Points based on time AND chore (e.g., "Morning-stable cleaning" = 4p, "Morning-feeding" = 2p)
  - **Day**: Which days of the week the shift applies (Monday-Sunday)

**Example shift types**:
| **Shift Type** | **Time** | **Chore** | **Points** |
|-------------|---------|------------|-----------|
| Morning-stable cleaning | 06:00-09:00 | Stable cleaning | 4 |
| Morning-feeding | 06:00-08:00 | Feeding | 2 |
| Lunch-feeding | 11:00-13:00 | Feeding | 1 |
| Evening-stable cleaning | 17:00-20:00 | Stable cleaning | 3 |
| Evening-turnout | 17:00-19:00 | Turnout | 2 |

**Holiday Calendar**:
- System automatically imports Swedish holidays
- Stable owner can define if holidays should have different shift types/weights

**User Stories**:
- As stable owner I want to create shift types with flexible time, chore, and weighting
- As stable owner I want to define different schedules for weekdays vs. weekends

#### 2.2 Standard Schedule & Publishing
**Creating schedule**:
- Stable owner builds a standard schedule (e.g., "Weekly shifts")
- Schedule can differ for different seasons (e.g., summer vs. winter)
- Schedule can be rolling (continuous forward) or fixed period (e.g., one month)

**Hybrid model for distribution**:
1. **System Suggestion**: System analyzes:
   - Boarders' historical points
   - Availability (if specified)
   - Individual limits (if set)
   - Suggests fair distribution that balances points over configured period

2. **Manual Adjustment**: Stable administrator can:
   - Move shifts between boarders
   - Lock/release specific shifts
   - Force distribution if certain shifts are unstaffed

3. **Publishing**: Stable administrator publishes schedule
   - Boarders receive notification
   - Schedule becomes visible and bookable

**User Stories**:
- As stable owner I want the system to suggest fair distribution based on history
- As stable owner I want to manually adjust the system's suggestion before publishing
- As stable owner I want to create different standard schedules for summer/winter

#### 2.3 Shift Management for Boarders
**Functions**:
- **View schedule**: Calendar view with all shifts (own + others')
- **Take shift**: Book available shifts (if allowed by configuration)
- **Swap shift**: Direct swap with another boarder (no approval workflow)
- **Cancel shift**: Emergency cancellation
  - Shift is returned to pool
  - Stable administrator is notified
  - Configuration parameter: if other boarders should be automatically notified
- **Comment on shift**: Simple comment function on each shift (e.g., "Can swap to Thursday if anyone wants")

**User Stories**:
- As boarder I want to see all my upcoming shifts in a clear calendar view
- As boarder I want to swap shifts directly with another boarder without waiting for approval
- As boarder I want to cancel a shift in emergency and get confirmation that administrator was notified
- As boarder I want to comment on shifts to communicate with others

#### 2.4 Weighting & Fairness System
**Point Calculation**:
- Each shift gives points based on its weighting
- Boarders accumulate points over a configurable period (e.g., 30 days, 90 days)
- System aims to keep all boarders within ±10% of average points

**Mandatory number of shifts**:
- Stable administrator can set minimum requirement per boarder per period
- Example: "At least 15 points per month" or "At least 4 shifts per month"

**Individual limits** (optional):
- Stable administrator can set limits per boarder:
  - "Anna: max 2 shifts/week" (limited time)
  - "Björn: min 4 shifts/week" (wants to contribute more)

**Fairness Meter** (only visible to stable administrator):
- Dashboard with:
  - Total points per boarder recent period
  - Average and deviation from average
  - List of who has done most/least shifts
  - "Fairness Index" (0-100, where 100 = perfect balance)

**Memory Horizon**:
- Configuration parameter per stable
- Stable administrator chooses how far back system should count (e.g., rolling 30 days, rolling 90 days, per month with reset)

**User Stories**:
- As stable owner I want to see a fairness meter showing if distribution is balanced
- As stable owner I want to set individual limits for boarders with special needs
- As boarder I want to know that distribution is objective and based on actual points

#### 2.5 Unstaffed Shifts & Escalation
**Scenarios**:
- A shift is approaching (e.g., 24h before) and is still unstaffed

**Escalation Process**:
1. System automatically notifies stable administrator
2. Stable administrator can:
   - Manually assign shift to a boarder
   - Send reminder to all boarders
   - Mark as "emergency" (doesn't affect weighting if someone takes it last minute)

**User Stories**:
- As stable owner I want automatic notification when shifts approach unstaffed
- As stable owner I want to force distribution of unstaffed shifts

---

### 3. Notifications & Communication

#### 3.1 Notification Channels
**Basic (included in freemium)**:
- Email notifications
- In-app notifications

**Premium**:
- SMS notifications (cost)
- Telegram integration

#### 3.2 Notification Events
System should support the following notifications:

| **Event** | **Recipient** | **Channel** |
|--------------|---------------|-----------|
| New schedule published | All boarders | Email + In-app |
| Shift reminder (configurable time before) | Boarder with shift | Email/SMS/Telegram + In-app |
| New boarder added | All boarders | Email + In-app |
| Boarder requests membership | Stable administrator | Email + In-app |
| Shift available (emergency cancellation) | All boarders (if configured) | Email + In-app |
| Shift available (emergency cancellation) | Stable administrator (always) | Email + In-app |
| Shift swap completed | Both boarders | Email + In-app |
| Unstaffed shift approaching | Stable administrator | Email + In-app |
| Monthly summary | All boarders | Email |
| Low points reminder | Boarder below minimum | Email + In-app |
| Admin message | All boarders in stable | Email + In-app + Push |

#### 3.3 Notification Settings
- **Per stable**: Boarder can have different settings for each stable they're in
- **Per event type**: Boarder can choose which events they want notifications for
- **Per channel**: Boarder can choose channel (email, SMS, Telegram, in-app, push) per event type

**User Stories**:
- As boarder I want to choose to get shift reminders 24h before via SMS but monthly summary via email
- As boarder in multiple stables I want to have different notification settings for each stable

#### 3.4 Admin Messages
**Functions**:
- Stable administrator can send messages to all boarders
- Messages are displayed:
  - In a "Bulletin Board" (in-app feed)
  - As push notification
  - Via email (if boarder has chosen it)

**User Stories**:
- As stable owner I want to send a message to all boarders when something important happens (e.g., "Stable construction starts Monday")

#### 3.5 Comments on Shifts
**Functions**:
- Simple comment field on each shift
- Boarders can write messages (e.g., "Can swap to Thursday")
- Comments are visible to everyone in the stable
- Notification to relevant parties (e.g., if someone comments on your shift)

**User Stories**:
- As boarder I want to write a comment on my shift to offer a swap

---

### 4. Reporting & Statistics

#### 4.1 Stable Administrator - Reports
**Dashboard with the following data**:

1. **Activity per boarder**:
   - Number of shifts last month
   - Point distribution
   - Deviation from average
   - Trend over time

2. **Most/least popular shift times**:
   - Heatmap of which times are taken fastest
   - Identify shift times that often remain unstaffed

3. **Missed/unstaffed shifts**:
   - Number of shifts not taken
   - How many times escalation occurred
   - Which shifts are most often missed

4. **Average response time**:
   - How quickly boarders take shifts after publishing
   - Identify if schedule is published too late

5. **Fairness Index**:
   - Point distribution visualized
   - Standard deviation from average
   - Trend over time (is it becoming more or less fair?)

6. **Trends over time**:
   - Engagement per month
   - Point distribution per quarter
   - Activity per boarder over time

7. **Export**:
   - Export reports to Excel/PDF
   - For accounting to boarders or internal analysis

**User Stories**:
- As stable owner I want to see which boarders have contributed most/least last month
- As stable owner I want to export statistics to Excel to show at annual meeting

#### 4.2 System Administrator - Aggregated Statistics
**Admin panel with the following data**:

1. **Number of active stables/stable owners**:
   - Total number of stables in system
   - Active vs. inactive subscriptions

2. **Total number of boarders**:
   - Total user base
   - Average number of boarders per stable

3. **Usage statistics**:
   - Which features are used most/least?
   - Feature adoption rate

4. **Churn rate**:
   - How many stable owners stop using service per month
   - Retention rate

5. **Engagement metrics**:
   - Login frequency
   - Number of bookings per stable
   - DAU/MAU (Daily/Monthly Active Users)

6. **Revenue metrics**:
   - MRR (Monthly Recurring Revenue)
   - ARPU (Average Revenue Per User)
   - LTV (Customer Lifetime Value)

**User Stories**:
- As system admin I want to see how many stables are active and their usage patterns
- As system admin I want to identify stables with low usage for proactive support

#### 4.3 Boarder - Own History
**Functions**:
- **Shift history**: List of all shifts boarder has done
  - Date, time, chore, points
  - Filter per month/quarter
- **Calendar view**: Visual representation of historical shifts
- **Total points**: Aggregated points for selected period
- **(Future)**: Comparison with average, badges/achievements

**User Stories**:
- As boarder I want to see all shifts I've done last month to verify my contribution

---

### 5. Payment & Subscription

#### 5.1 Freemium Model
**Free tier**:
- Up to **X number of boarders** (e.g., 5 or 10)
- Limited functionality:
  - Basic scheduling
  - Email notifications
  - Simple statistics

**Premium tier - Tiered Model**:
| **Stable Size** | **Price/month** | **Included** |
|-------------------|----------------|----------------|
| 0-10 boarders | Free | Basic features |
| 11-25 boarders | 299 SEK | + Advanced statistics, SMS notifications (limited) |
| 26-50 boarders | 499 SEK | + Unlimited SMS, Telegram, export |
| 51+ boarders | 799 SEK | + Priority support, custom reports |

**Premium services (add-ons)**:
- SMS notifications: 0.50 SEK/SMS (package: 50 SMS/month for 20 SEK)
- Telegram integration: 49 SEK/month
- Advanced reporting: 99 SEK/month
- API access (future): 199 SEK/month

#### 5.2 Payment Integration
**Payment Methods**:
- Stripe (card, Apple Pay, Google Pay)
- Swish (for Swedish customers)
- Autogiro (for annual subscriptions)

**Billing**:
- Automatic monthly billing
- Option for annual subscription with discount (e.g., 10%)
- Automatic receipts via email

**User Stories**:
- As stable owner I want to easily upgrade my subscription when I get more boarders
- As stable owner I want to choose between monthly and annual subscription

---

## 🚫 Out of Scope (MVP1)

The following features are **NOT** included in MVP1 but can be considered for future versions:

1. **Invoicing of boarders**: Stable owner cannot invoice their boarders via system (handled externally)
2. **Temporary substitutes**: Only regular boarders can take shifts (no temporary guests)
3. **Seasonal variation in weighting**: Same weights year-round (no summer-winter adjustment)
4. **Gamification for boarders**: No badges, achievements, or leaderboards
5. **Mobile app**: Web-based responsive design first, native app later
6. **Integration with horse registry**: No automatic import of horse information
7. **Veterinary/farrier booking**: Only chores, not other types of bookings
8. **Chat function**: Only comments on shifts, no full chat functionality

---

## 🔮 Future Considerations (Version 2+)

1. **Mobile app** (iOS & Android):
   - Push notifications
   - Faster access than browser

2. **Advanced gamification**:
   - Badges for milestones ("100 morning shifts!")
   - Leaderboards (optional participation)

3. **Integration with horse registry**:
   - Automatic import from Swedish Horse Association
   - Sync of horse information

4. **Temporary substitutes**:
   - Boarder can invite friend as one-time substitute
   - Limited access to system

5. **Seasonal variation**:
   - Automatic weight adjustment based on season
   - Sunset/sunrise integration to weight dark shifts higher

6. **Chat function**:
   - 1-to-1 chat between boarders
   - Group chat per stable

7. **Invoicing of boarders**:
   - Stable administrator can send invoices for stable rent
   - Payment via system

8. **API for third-party integrations**:
   - Integration with existing stable systems
   - Webhook support for event-driven architecture

9. **Multi-language support**:
   - English, Norwegian, Danish, Finnish

10. **AI-driven scheduling**:
    - Machine learning to predict which shifts will be unstaffed
    - Automatic optimization based on historical patterns

---

## 🏗️ System Architecture (High-Level)

The Stable Booking System uses a modern, Firebase-based architecture on Google Cloud Platform.

### Architecture Overview

**Frontend**:
- React 19 (Vite) with TypeScript
- Firebase Hosting (CDN + SSL)
- Real-time sync via Firestore

**Backend**:
- Cloud Run Services (Node.js 24) - RESTful API
- Cloud Functions Gen2 (Node.js 22) - Background jobs
- Firebase Firestore - NoSQL database
- Firebase Authentication - JWT-based auth
  - Email/Password provider
  - Google Sign-In provider (OAuth 2.0)

**Infrastructure**:
- Google Cloud Platform (GCP)
- Firebase Platform (Firestore, Auth, Hosting, Storage)
- Terraform (Infrastructure as Code)

**Integrations**:
- Stripe API (payments)
- Twilio (SMS)
- SendGrid (email)
- Telegram Bot API (notifications)

### Detailed Documentation

For complete technical specification and database design, see:

📄 **[TECH_STACK.md](./TECH_STACK.md)** - Complete tech stack with:
- System architecture diagram
- Frontend stack (React, Vite, Firebase SDK)
- Backend stack (Cloud Run Services + Cloud Functions)
- External integrations (Stripe, Twilio, SendGrid, Telegram)
- Deployment & CI/CD pipeline
- Testing strategy
- Cost estimation

📄 **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Firestore database schema with:
- Collection structure (users, stables, shifts, subscriptions, analytics)
- Document schemas (TypeScript interfaces)
- Firestore Security Rules
- Query examples and performance optimization
- Indexing strategy
- Backup & recovery

---

## 📊 Success Metrics & KPIs

### User Adoption
- **Target**: 10 active stables within 3 months after launch
- **Measurement**: Number of stables with at least 5 active boarders

### User Engagement
- **Target**: 30% DAU (Daily Active Users)
- **Measurement**: Number of unique logins per day / total number of boarders

### Product Satisfaction
- **Target**: NPS >50
- **Measurement**: Quarterly NPS survey

### Retention
- **Target**: >80% retention after 3 months
- **Measurement**: Number of stable owners who continued subscription after Q1

### Revenue
- **Target**: 50,000 SEK MRR within 12 months
- **Measurement**: Total monthly revenue from all subscriptions

---

## 📝 User Stories (Summary)

### System Administrator
1. As system admin I want to see all active stable owners to have overview of platform
2. As system admin I want to log in with read-only view to help customers with support
3. As system admin I want to see usage statistics to optimize product

### Stable Owner/Stable Administrator
4. As stable owner I want to invite new boarders via email
5. As stable owner I want to create shift types with flexible time, chore, and weighting
6. As stable owner I want the system to suggest fair distribution based on history
7. As stable owner I want to manually adjust system's suggestion before publishing
8. As stable owner I want to see a fairness meter showing if distribution is balanced
9. As stable owner I want automatic notification when shifts approach unstaffed
10. As stable owner I want to export statistics to Excel

### Boarder
11. As boarder I want to search for my stable and request membership
12. As boarder I want to see all my upcoming shifts in a clear calendar view
13. As boarder I want to swap shifts directly with another boarder without approval
14. As boarder I want to cancel a shift in emergency and get confirmation that admin was notified
15. As boarder I want shift reminders 24h before via my chosen channel (email/SMS/Telegram)
16. As boarder I want to see all shifts I've done last month to verify my contribution

---

## 🎨 UI/UX Considerations

### Design Principles
1. **Mobile-First Design**:
   - Primary design for mobile devices (320px-768px)
   - Touch-optimized UI (minimum 44x44px touch targets)
   - Thumb-zone navigation for one-handed use
   - Progressive enhancement for desktop
   - Preparation for future native iOS/Android apps

2. **Simplicity**:
   - Minimalist design, focus on functionality
   - Maximum information with minimal UI clutter
   - Clear call-to-actions

3. **Accessibility**:
   - WCAG 2.1 AA compliance (keyboard navigation, screen reader support)
   - High contrast mode support
   - Scalable text (rem units)
   - Focus indicators for keyboard navigation

4. **Performance**:
   - <2 seconds load time on 4G mobile network
   - <1 second on WiFi
   - Optimized images (WebP/AVIF)
   - Lazy loading for images and routes

### Mobile-First Strategy

**Viewport Breakpoints**:
- **Mobile**: 320px - 767px (primary design target)
- **Tablet**: 768px - 1023px (enhanced layout)
- **Desktop**: 1024px+ (full features)

**Mobile-Specific Features**:
- **Bottom Navigation**: Primary navigation in thumb zone
- **Swipe Gestures**: Swipe to navigate between views, swap shifts
- **Pull-to-Refresh**: Update data through pull-down
- **Offline Support**: Service Worker for offline functionality (PWA)
- **Home Screen Installation**: Add to Home Screen prompt
- **Push Notifications**: Browser push notifications (desktop + mobile)

**Touch Optimizations**:
- Minimum 44x44px touch targets (WCAG guideline)
- Generous padding between clickable elements
- Large buttons for primary actions
- Confirmation dialogs for destructive actions

### Key Screens (Mobile-First Layout)

1. **Dashboard** (different for system admin, stable owner, boarder)
   - Card-based layout for touch interaction
   - Quick actions in thumb zone
   - Swipeable stats widgets

2. **Calendar View** (schedule, shifts, history)
   - Swipeable week/month views
   - Tap shift for quick actions
   - Bottom sheet for shift details

3. **Shift Management** (book, swap, cancel)
   - Large action buttons
   - Drag-and-drop for desktop, tap-select for mobile
   - Confirmation dialogs

4. **Statistics & Reports**
   - Vertical charts optimized for mobile
   - Expandable sections
   - Export via share sheet

5. **Settings** (profile, notifications, stable)
   - Grouped settings in cards
   - Toggle switches for on/off
   - Native-like transitions

6. **Admin Panel** (shift types, boarders, roles)
   - Simplified mobile admin view
   - Full features on desktop

### Future Native App Considerations

**Progressive Web App (PWA) Foundation**:
- Service Worker for offline support
- Web App Manifest for installation
- Push Notifications
- Background Sync
- Share Target API

**Migration Path to Native Apps**:
- **iOS**: React Native or Swift (future)
- **Android**: React Native or Kotlin (future)
- **Code Sharing**: Shared business logic (TypeScript)
- **API-First**: RESTful API ready for native clients
- **Design System**: Figma components exportable to native

---

## 🔒 Non-Functional Requirements

### Security
- HTTPS everywhere (TLS 1.3)
- JWT-based authentication
- RBAC (Role-Based Access Control)
- GDPR compliance (data protection, right to be forgotten)
- 2FA (two-factor authentication) for system admins

### Performance
- <2 seconds page load
- <500ms API response time
- Support for 1000 concurrent users

### Reliability
- 99.5% uptime SLA
- Automatic backups (daily)
- Disaster recovery plan (RTO <4h, RPO <1h)

### Scalability
- Horizontal scaling (Cloud Run auto-scaling)
- Database read replicas for read-intensive queries

### Compliance
- GDPR (data protection)
- PCI DSS (if own card handling, otherwise Stripe)

---

## 📅 Roadmap (Tentative)

### Phase 1: MVP1 (Q1-Q2 2026)
- [ ] Basic user management (all roles)
- [ ] Shift types & weighting
- [ ] Hybrid scheduling
- [ ] Booking system
- [ ] Email notifications
- [ ] Basic statistics
- [ ] Freemium + payment integration (Stripe)

### Phase 2: Iteration & Feedback (Q3 2026)
- [ ] SMS notifications (premium)
- [ ] Telegram integration (premium)
- [ ] Advanced statistics & export
- [ ] Admin messages (bulletin board)
- [ ] Improved UI/UX based on feedback

### Phase 3: Expansion (Q4 2026 - Q1 2027)
- [ ] Mobile app (iOS & Android)
- [ ] Multi-language support
- [ ] API for third-party integrations
- [ ] Gamification (badges, achievements)

---

## 🔍 Open Questions & Assumptions

### Open Questions
1. **Freemium limit**: How many boarders should be free? (5, 10, or 15?)
2. **SMS pricing**: Should SMS be per-SMS or package?
3. **Holiday calendar**: Automatic import or manual configuration?
4. **Data retention**: How long should we keep historical data? (1 year, 2 years, indefinitely?)

### Assumptions
1. Stable owners are willing to pay 299-799 SEK/month for the service
2. Boarders want transparent and fair shift distribution
3. Email is sufficient for MVP notifications
4. Stable owners have basic digital competency

---

## 📞 Stakeholders & Contact

| **Role** | **Name** | **Responsibility** |
|----------|----------|------------|
| Product Owner | TBD | Product strategy, prioritization |
| Tech Lead | TBD | Technical architecture, implementation |
| Design Lead | TBD | UI/UX, user experience |
| Business Owner | TBD | Business strategy, pricing |

---

## 📚 Appendix

### Glossary
- **Shift**: A time period with a specific chore (e.g., "Morning-stable cleaning")
- **Shift Type**: A defined template for shifts (time + chore + weighting)
- **Weighting**: Point system to assess how heavy a shift is
- **Fairness Meter**: Dashboard showing balance in shift distribution
- **Stable Administrator**: Person managing a specific stable
- **System Administrator**: Person managing entire SaaS platform

### References
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Document Version History**:
| **Version** | **Date** | **Changes** | **Author** |
|-------------|-----------|---------------|----------------|
| 1.0 | 2025-12-25 | Initial draft | Product Team |

---

**Approvals**:
- [ ] Product Owner
- [ ] Tech Lead
- [ ] Business Owner

---

*This is a living document that will be updated based on feedback and new insights.*
