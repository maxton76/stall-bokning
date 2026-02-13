# EquiDuty Facility Booking System - User Stories & Requirements

**Based on**: Research of Swedish horse forums (Bukefalos, iFokus, stable websites)
**Date**: 2026-02-14
**Goal**: Build a world-class facility booking system that solves real Swedish horse community pain points

---

## User Personas

### 👤 Persona 1: Emma - Working Professional Horse Owner
- **Age**: 32, works office hours (8-5)
- **Horse**: Own horse, recreational riding + occasional shows
- **Pain Points**: Can't access arena during convenient hours, riding school takes priority
- **Needs**: Evening/weekend slots, advance booking, fair access, spontaneity when weather is good

### 👤 Persona 2: Karin - Competitive Dressage Rider
- **Age**: 24, semi-professional
- **Horse**: Competition horse, trains 5-6 days/week
- **Pain Points**: Needs predictable schedules for trainer coordination, specific equipment
- **Needs**: Recurring bookings, trainer sync, jump equipment, priority during show season

### 👤 Persona 3: Lars - Riding School Owner
- **Age**: 48, manages 30 lesson horses + 15 private boarders
- **Horse**: Multiple
- **Pain Points**: Balancing commercial lessons vs private boarder access, conflicts, no-shows
- **Needs**: Priority slots for lessons, fair allocation system, transparent rules, revenue optimization

### 👤 Persona 4: Sofia - Weekend Recreational Rider
- **Age**: 19, student, rides parents' horse
- **Horse**: Family horse
- **Pain Points**: All good slots taken by advance bookings, no spontaneity
- **Needs**: Last-minute availability, fair share of weekend slots, flexible cancellation

### 👤 Persona 5: Anders - Facility Manager
- **Age**: 55, manages multi-facility stable (indoor arena, outdoor, jumping, dressage)
- **Horse**: None (staff)
- **Pain Points**: Equipment conflicts, no buffer time, safety issues from overcrowding
- **Needs**: Equipment tracking, cleaning time, usage analytics, maintenance scheduling

---

## Epic 1: Transparent & Fair Access System

### Story 1.1: Visible Booking Calendar (All Users)
**As a** horse owner
**I want to** see a comprehensive calendar showing all facility bookings
**So that** I can plan my riding schedule and understand why slots are unavailable

**Acceptance Criteria:**
- ✅ Multi-facility view showing all arenas/paddocks simultaneously
- ✅ Color-coded by booking type (riding school, private, maintenance)
- ✅ Show booking owner name (with privacy settings)
- ✅ Display equipment reservations (jumps, dressage letters)
- ✅ Real-time updates when bookings change
- ✅ Historical view (30 days back) to identify patterns

**Addresses Pain Point**: #5 (Opaque booking systems)

---

### Story 1.2: Fair Quota System (Private Boarders)
**As a** private horse owner paying stallplats fees
**I want** guaranteed minimum access to facilities each week
**So that** I can ride my horse regularly despite riding school priority

**Acceptance Criteria:**
- ✅ Configurable quota per user type (e.g., 3 prime-time slots/week minimum)
- ✅ Protected slots that riding school cannot override
- ✅ Quota usage dashboard showing "used 2 of 5 slots this week"
- ✅ Rollover rules: unused quota = priority next week
- ✅ Override capability for stable owner in emergencies

**Addresses Pain Point**: #1 (Riding school priority inequality)

---

### Story 1.3: Advance Booking Limits (Recreational Riders)
**As a** weekend recreational rider
**I want** limits on how far ahead competitive riders can book
**So that** I have a fair chance to access facilities

**Acceptance Criteria:**
- ✅ Tiered booking windows:
  - Riding school: 4 weeks advance
  - Competitive riders: 2 weeks advance
  - Recreational: 1 week advance
  - Walk-ins: Same day
- ✅ Rolling window (not calendar month)
- ✅ Priority release: "Competitive slots open to recreational 48h before"
- ✅ Notification when new slots become available

**Addresses Pain Point**: #2 (Advance booking kills spontaneity), #3 (Peak hour congestion)

---

### Story 1.4: Seasonal Priority Adjustment (Competition Season)
**As a** competitive rider preparing for show season
**I want** priority access to facilities March-September
**So that** I can maintain consistent training programs

**Acceptance Criteria:**
- ✅ Configurable seasonal rules per stable
- ✅ "Show season mode": competitive riders get 3-week advance booking
- ✅ Off-season (Oct-Feb): equal access for all
- ✅ Dashboard showing current season rules
- ✅ Automatic notifications when season changes

**Addresses Pain Point**: #15 (No seasonal priority systems)

---

## Epic 2: Multi-Resource Booking Intelligence

### Story 2.1: Integrated Resource Booking (Lesson Students)
**As a** riding lesson student
**I want to** book arena + trainer + specific horse + equipment in one action
**So that** I don't waste time coordinating multiple calendars

**Acceptance Criteria:**
- ✅ Single booking form: Select all resources simultaneously
- ✅ Availability engine shows only slots where ALL resources free
- ✅ Conflict detection: "Trainer available but arena booked"
- ✅ Smart suggestions: "Arena A + Trainer Emma available 10-11 AM"
- ✅ Atomic transaction: all resources reserved together or none

**Addresses Pain Point**: #7 (No multi-resource integration)

---

### Story 2.2: Equipment Reservation System (Jumping Riders)
**As a** jumping rider
**I want to** book jump equipment separate from empty arena time
**So that** setup/teardown time doesn't cause conflicts

**Acceptance Criteria:**
- ✅ Equipment library: "10x cavaletti, 5x oxer, 1x liverpool"
- ✅ Equipment unavailability blocks (e.g., "oxer set reserved 3-4 PM")
- ✅ Setup/teardown time auto-added (15 min before/after)
- ✅ Equipment damage reporting integrated
- ✅ Photo upload: "Course layout I want" for staff to prepare

**Addresses Pain Point**: #9 (Shared equipment conflicts)

---

### Story 2.3: Trainer Coordination Sync (Trainers)
**As a** riding trainer
**I want** my calendar to sync with facility bookings
**So that** students can book me + arena simultaneously

**Acceptance Criteria:**
- ✅ Trainer availability marked on facility calendar
- ✅ Booking flow: "Book with trainer X" → shows only trainer's available slots
- ✅ Trainer notification when booked
- ✅ Trainer cancellation cascades to facility (free arena + refund student)
- ✅ Recurring lesson series: "Every Tuesday 5-6 PM for 10 weeks"

**Addresses Pain Point**: #7 (Multi-resource coordination)

---

## Epic 3: Intelligent Time Management

### Story 3.1: Automatic Buffer Time (All Users)
**As a** facility manager
**I want** configurable buffer time between bookings
**So that** users have time to set up equipment and clean up

**Acceptance Criteria:**
- ✅ Configurable buffer per activity type:
  - Jumping: 15 min setup + 10 min cleanup
  - Dressage: 5 min transition
  - Lessons: 10 min between groups
- ✅ Buffer shown on calendar as "unavailable" block
- ✅ Previous user gets "5 min warning" notification
- ✅ Next user can't enter until buffer complete
- ✅ Analytics: "Average setup time for jump course = 12 min"

**Addresses Pain Point**: #8 (Insufficient buffer time)

---

### Story 3.2: Weather-Based Rescheduling (Outdoor Arena Users)
**As a** rider with outdoor arena booking
**I want** automatic rebooking when weather is bad
**So that** I don't lose my slot due to mud/ice

**Acceptance Criteria:**
- ✅ Weather API integration (SMHI)
- ✅ Automatic alerts: "Heavy rain forecast, outdoor arena unavailable"
- ✅ Rebooking priority: outdoor users get first pick of indoor slots
- ✅ Weather history: "Outdoor arena closed 14 days this month"
- ✅ Manual override: "I'll ride anyway" option

**Addresses Pain Point**: #4 (Limited outdoor access during transition seasons)

---

### Story 3.3: Peak Hour Congestion Management (Evening Riders)
**As a** working professional riding evenings
**I want** fair rotation of peak slots (5-9 PM)
**So that** same people don't monopolize prime time

**Acceptance Criteria:**
- ✅ Peak hour quota: Max 2 prime slots per week
- ✅ Rotation algorithm: "You had 6-7 PM Monday, next week you're deprioritized"
- ✅ Off-peak incentive: "Book before 5 PM = extra quota point"
- ✅ Dashboard: "You've used 2/3 peak slots this week"
- ✅ Waitlist system: "3 people waiting for 6 PM slots"

**Addresses Pain Point**: #3 (Peak hour congestion), #13 (Competitive vs recreational tension)

---

## Epic 4: Advanced Scheduling Features (Differentiators)

### Story 4.1: Cross-Facility Drag-and-Drop (Facility Manager)
**As a** facility manager with multiple arenas
**I want to** drag bookings between facilities on a unified calendar
**So that** I can optimize space usage and resolve conflicts

**Acceptance Criteria:**
- ✅ Multi-column calendar (one per facility)
- ✅ Drag booking from "Indoor Arena A" → "Outdoor Arena B"
- ✅ Conflict detection: "Outdoor closed for maintenance"
- ✅ Automatic user notification: "Your booking moved to Indoor B, same time"
- ✅ Bulk move: "Move all outdoor bookings to indoor due to weather"
- ✅ Undo capability within 5 minutes

**Feature Differentiator**: No Swedish stable software has this

---

### Story 4.2: Recurring Series with Smart Conflict Resolution (Competitive Riders)
**As a** competitive rider
**I want to** book recurring weekly training slots
**So that** I have consistent training without re-booking weekly

**Acceptance Criteria:**
- ✅ Create series: "Every Tuesday 5-6 PM for 12 weeks"
- ✅ Conflict handling: "Week 5 conflicts with riding school, suggest alternative?"
- ✅ Series modification: "Cancel just week 3" or "Move all remaining to 6-7 PM"
- ✅ Template system: "My usual training schedule" saved as preset
- ✅ Series priority: recurring bookings get slight priority over one-offs

**Feature Differentiator**: Rare in equestrian software

---

### Story 4.3: AI-Powered Smart Scheduling (All Users)
**As a** horse owner
**I want** the system to suggest optimal booking times
**So that** I don't waste time hunting for available slots

**Acceptance Criteria:**
- ✅ Smart suggestions: "Based on your history, you prefer Wed 6 PM"
- ✅ Conflict resolution: "Arena A full, Arena B available same time?"
- ✅ Multi-resource optimization: "Trainer + arena + equipment all available Fri 4 PM"
- ✅ Learn preferences: "You usually book after work, avoiding weekends"
- ✅ Proactive alerts: "Your usual slot is available next week, book now?"

**Feature Differentiator**: Machine learning in stable management

---

### Story 4.4: Real-Time Collaboration & Sharing (Friends/Groups)
**As a** group of riders training together
**I want to** book arena for multiple people simultaneously
**So that** we can coordinate group training sessions

**Acceptance Criteria:**
- ✅ Group booking: "Book for Emma, Karin, Sofia (3 riders)"
- ✅ Split cost: "150 kr divided 3 ways = 50 kr each"
- ✅ Invitations: "Karin invited you to share 5-6 PM slot"
- ✅ Group cancellation rules: "2/3 people cancel = full refund"
- ✅ Private groups: "My usual jumping friends" saved list

**Feature Differentiator**: Social booking features

---

## Epic 5: Fairness & Transparency

### Story 5.1: Booking History & Analytics (Private Boarders)
**As a** private boarder paying monthly fees
**I want to** see exactly how much I've used facilities
**So that** I can verify I'm getting value for money

**Acceptance Criteria:**
- ✅ Personal usage dashboard:
  - "You rode 12 hours this month"
  - "4 peak hours, 8 off-peak hours"
  - "Avg cost per ride: 75 kr"
- ✅ Compare to quota: "Used 80% of your allocation"
- ✅ Historical trends: "You ride 30% more in summer"
- ✅ Export data: CSV for personal tracking

**Addresses Pain Point**: #11 (Pricing fairness concerns)

---

### Story 5.2: Transparent Rule Changes (All Users)
**As a** stable member
**I want** advance notice of booking rule changes
**So that** I can plan accordingly and feel respected

**Acceptance Criteria:**
- ✅ 14-day notice for rule changes
- ✅ In-app notification + email
- ✅ Change log: "What changed and why"
- ✅ Comment system: "Provide feedback on new rules"
- ✅ Rollback option if community opposes

**Addresses Pain Point**: #6 (Inconsistent rules without notice)

---

### Story 5.3: No-Show & Cancellation Fairness (Lesson Students)
**As a** lesson student
**I want** clear, fair cancellation policies with grace periods
**So that** I don't get charged for genuine emergencies

**Acceptance Criteria:**
- ✅ Tiered cancellation:
  - 48h+ notice: Full refund
  - 24-48h: 50% refund
  - <24h: No refund (except medical emergency)
  - No-show: 100% charge + warning
- ✅ Grace allowance: "1 free emergency cancellation per month"
- ✅ Automatic processing: No waiting until Monday
- ✅ Medical certificate upload for emergency refunds
- ✅ No-show tracking: "3 no-shows = booking suspension"

**Addresses Pain Point**: #12 (Unclear cancellation policies)

---

### Story 5.4: Priority Transparency Dashboard (Stable Owner)
**As a** stable owner
**I want** a public-facing priority rules dashboard
**So that** boarders understand and accept booking hierarchy

**Acceptance Criteria:**
- ✅ Priority matrix visible to all:
  ```
  1. Riding school lessons (Mon-Fri 5-8 PM)
  2. Competitive riders (show season priority)
  3. Recreational riders (quota-based access)
  4. Walk-ins (same day availability)
  ```
- ✅ Justification for each rule
- ✅ "Your current priority level: Tier 2 (Competitive)"
- ✅ How to upgrade: "Compete in 3 shows = Tier 2 access"

**Addresses Pain Point**: #5 (Lack of transparency), #13 (Competitive vs recreational tension)

---

## Epic 6: Safety & Quality of Life

### Story 6.1: Shared Riding Safety Controls (All Users)
**As a** rider
**I want** limits on simultaneous users per arena
**So that** I can ride safely without overcrowding

**Acceptance Criteria:**
- ✅ Max occupancy per arena: "Indoor A: Max 4 riders"
- ✅ Skill level matching: "Beginner + advanced = warning"
- ✅ Activity segregation: "No jumping during dressage lesson"
- ✅ Real-time occupancy: "3/4 slots filled right now"
- ✅ Check-in system: Confirm arrival to release slot if no-show

**Addresses Pain Point**: #14 (Shared riding creates safety issues)

---

### Story 6.2: Equipment Damage Reporting (Equipment Users)
**As a** rider who uses shared equipment
**I want to** report damage immediately with photos
**So that** I'm not blamed for pre-existing issues

**Acceptance Criteria:**
- ✅ Pre-booking checklist: "Inspect equipment before use"
- ✅ Photo upload: "Cavaletto broken, photo attached"
- ✅ Damage history: "This oxer damaged 3 times this month"
- ✅ Automatic maintenance scheduling
- ✅ Responsibility tracking: "Who last used this?"

**Addresses Pain Point**: #9 (Equipment conflict disputes)

---

### Story 6.3: Lighting & Evening Booking Integration (Winter Riders)
**As a** winter evening rider
**I want** automatic lighting activation with my booking
**So that** I can ride safely after dark

**Acceptance Criteria:**
- ✅ Lighting rules: "Lights on Oct 15 - Mar 15, 4 PM onward"
- ✅ Automatic activation: "Your 5 PM booking turns on lights at 4:55 PM"
- ✅ Energy cost allocation: "Evening bookings +10 kr for lighting"
- ✅ Outdoor arena lighting upgrade recommendations
- ✅ Sunset/sunrise aware scheduling

**Addresses Pain Point**: #10 (Inadequate lighting for evening use)

---

## Feature Comparison Matrix

| Feature | Current Swedish Systems | EquiDuty Solution | Competitive Advantage |
|---------|------------------------|-------------------|----------------------|
| **Multi-facility view** | ❌ Single calendar | ✅ Unified dashboard | HIGH |
| **Drag between facilities** | ❌ No | ✅ Yes, real-time | **UNIQUE** |
| **Multi-resource booking** | ⚠️ Manual coordination | ✅ Atomic transactions | HIGH |
| **Equipment tracking** | ❌ No | ✅ Full inventory + damage reporting | MEDIUM |
| **Fair quota system** | ❌ No | ✅ Configurable quotas + rollover | HIGH |
| **Transparent rules** | ❌ Hidden | ✅ Public priority dashboard | MEDIUM |
| **Smart scheduling AI** | ❌ No | ✅ ML-based suggestions | **UNIQUE** |
| **Seasonal priorities** | ❌ Manual | ✅ Automatic season modes | MEDIUM |
| **Weather integration** | ❌ No | ✅ SMHI + auto-rebooking | MEDIUM |
| **Group bookings** | ❌ No | ✅ Social sharing + cost split | MEDIUM |
| **Recurring series** | ⚠️ Basic | ✅ Smart conflict resolution | HIGH |
| **Real-time updates** | ⚠️ Slow | ✅ Firestore real-time | MEDIUM |
| **Buffer time automation** | ❌ Manual | ✅ Activity-based buffers | MEDIUM |
| **Usage analytics** | ❌ No | ✅ Personal + stable dashboards | HIGH |

---

## Success Metrics (KPIs)

### User Satisfaction
- ✅ **Booking friction**: <2 clicks to book familiar slot
- ✅ **Conflict rate**: <5% of bookings result in disputes
- ✅ **No-show rate**: <3% (industry avg: 10-15%)
- ✅ **User retention**: 90%+ monthly active users

### Fairness Metrics
- ✅ **Access equity**: Private boarders use ≥80% of quota allocation
- ✅ **Peak hour distribution**: Gini coefficient <0.3 (fair distribution)
- ✅ **Complaint volume**: <1 complaint per 100 bookings

### Business Metrics
- ✅ **Facility utilization**: 75%+ occupancy during prime hours
- ✅ **Revenue optimization**: Dynamic pricing increases revenue 15%+
- ✅ **Customer acquisition**: 20% of new boarders cite booking system as reason

### Technical Metrics
- ✅ **Real-time sync**: <500ms booking confirmation
- ✅ **Mobile responsiveness**: Works flawlessly on iPhone/Android
- ✅ **Uptime**: 99.9%

---

## Implementation Roadmap

### Phase 1: Core Booking (Weeks 1-4)
- Multi-facility calendar UI (custom @dnd-kit solution)
- Basic drag-and-drop booking
- Real-time conflict detection
- Simple resource availability

### Phase 2: Fairness & Quotas (Weeks 5-6)
- Quota system implementation
- Priority rules engine
- Transparent dashboard
- Advance booking limits

### Phase 3: Multi-Resource (Weeks 7-9)
- Equipment inventory system
- Trainer calendar sync
- Atomic multi-resource booking
- Buffer time automation

### Phase 4: Intelligence (Weeks 10-12)
- Smart scheduling suggestions
- Weather integration (SMHI API)
- Recurring series with conflict resolution
- Usage analytics dashboard

### Phase 5: Advanced Features (Weeks 13-16)
- Cross-facility drag-and-drop
- Group bookings & cost splitting
- AI-powered optimization
- Mobile app enhancements

---

## Competitive Positioning

**Swedish Market Landscape:**
- **Horsebooking.se**: Basic calendar, no multi-resource
- **Ridskola.nu**: Lesson management, no private booking
- **Stabelbokarna**: Manual Excel sheets
- **International**: HorseManager (UK), Stable Management (US) - not Swedish-focused

**EquiDuty's Unique Value:**
1. ✅ **Built for Swedish regulations** (SMHI, Swedish calendar, kronor pricing)
2. ✅ **Solves documented pain points** from real Swedish horse forums
3. ✅ **Only system with cross-facility intelligence**
4. ✅ **Fairness-first philosophy** addressing inequality complaints
5. ✅ **Modern tech stack** (React 19, Firestore real-time, mobile-first)

**Marketing Message:**
> "Slut på frustrerande bokningssystem. EquiDuty ger dig rättvis tillgång, full transparens och smart schemaläggning – byggd för svenska hästägare."
>
> (End frustrating booking systems. EquiDuty gives you fair access, full transparency, and smart scheduling – built for Swedish horse owners.)

---

## Next Steps

1. ✅ Remove FullCalendar resource-timegrid (commercial license issue)
2. ✅ Design custom calendar component using @dnd-kit
3. ✅ Implement core booking engine with fairness rules
4. ✅ Beta test with 3-5 Swedish stables
5. ✅ Iterate based on real user feedback
6. ✅ Launch with competitive pricing (undercut Horsebooking.se by 20%)
