# Selection Algorithms Guide

When a stable creates a Selection Occasion (Rutinval), the system needs to decide the order in which members pick their shifts. Three fairness algorithms are available, plus a manual option.

## Algorithm 1: Quota-Based Draft Pick (Kvotbaserat turordningsval)

### How it works

1. The system counts all available routine shifts in the date range and sums their point values (e.g., 30 shifts x 10 points = 300 points total)
2. It divides the total by the number of members to get a **quota** -- the fair share each person should pick (300 / 15 = 20 points per person)
3. Members take turns picking shifts in order until they've reached approximately their quota
4. The turn order is determined by what happened **last time**:
   - First time ever: alphabetical order by name
   - Subsequent times: **the order is reversed** -- whoever picked last in the previous occasion picks first this time
5. This reversal ensures that no one is permanently stuck at the end of the queue

### When to use it

- When the stable wants everyone to do roughly the same amount of work (equal point quotas)
- When fairness of pick position matters as much as fairness of workload
- Best for stables with regular monthly/quarterly selection occasions

### What members see

- Their position in the queue (e.g., "You are #3 of 12")
- Their point quota (e.g., "Pick shifts totaling approximately 20 points")
- Who picked before them and who's next

---

## Algorithm 2: Points Balance (Poangbalans)

### How it works

1. The system looks at how many points each member has earned from completed routines over the past period (default: last 90 days, configurable via memory horizon)
2. Members are sorted by their accumulated points -- **lowest points first**
3. The person who has done the least work gets to pick first, getting the best choice of dates
4. The person who has done the most work picks last -- but they've already earned more points from their work
5. New members with zero history automatically pick first

### When to use it

- When the stable wants to compensate members who've been doing more than their share
- When some members have been absent or unavailable recently
- Self-balancing: members who pick first accumulate more points, moving them down the list next time

### What members see

- Their total points and how it compares to others
- Their position in the queue based on their points
- Clear explanation: "You have 45 points (lowest), so you pick first"

---

## Algorithm 3: Fair Rotation (Rattvis rotation)

### How it works

1. The system looks at the turn order from the **last completed** selection occasion
2. The starting position shifts by one: if last time the order was Anna(1), Bengt(2), Clara(3), David(4), Erik(5) -- this time it becomes Bengt(1), Clara(2), David(3), Erik(4), Anna(5)
3. Next time: Clara(1), David(2), Erik(3), Anna(4), Bengt(5)
4. Everyone gets to be first picker exactly once every N occasions (where N = number of members)
5. First time ever (no history): alphabetical order

### When to use it

- When the stable wants maximum transparency and predictability
- When members want to know exactly when their "first pick" turn is coming
- Simplest to understand -- no calculations, no point tracking needed
- Good for stables where points tracking isn't important, just fair rotation

### What members see

- Their position this time and when they'll be first next
- Reference to the previous occasion and how the order rotated
- "Last time you were #4, this time you're #3, next time you'll be #2"

---

## Choosing the Right Algorithm

| Consideration | Quota-Based | Points Balance | Fair Rotation |
|---|---|---|---|
| Equal workload distribution | Best -- enforces point quotas | Good -- self-balancing over time | Neutral -- doesn't track workload |
| Pick position fairness | Best -- guaranteed reversal | Good -- changes based on work done | Best -- predictable rotation |
| Transparency | High -- quotas are visible | Medium -- requires understanding points | Highest -- simple and predictable |
| New member handling | Alphabetical placement | Picks first (0 points) | Added at end of queue |
| Complexity | Medium | Medium | Low |
| Best for | Regular occasions, equal workload | Varied participation, catch-up fairness | Simple stables, predictable rotation |

## Default Algorithm Setting

Stable administrators can set a default algorithm in **Stable Settings > Scheduling Preferences > Default Selection Process Algorithm**. When creating a new selection process, this algorithm will be pre-selected. The admin can still override it for individual occasions.

## History Tracking

The system automatically saves turn order history when a selection process completes. This history is used by the Quota-Based and Fair Rotation algorithms to determine the next turn order. The history is stored per-stable and includes:

- Final turn order (who picked in what position)
- Number of selections made by each member
- Total points picked by each member
- Completion timestamp

## Technical Details

- **Firestore collection**: `selectionProcessHistory/{id}` with indexes on `stableId` + `completedAt` (desc)
- **Algorithm service**: `packages/api/src/services/selectionAlgorithmService.ts`
- **Shared types**: `SelectionAlgorithm`, `ComputedTurnOrder`, `SelectionProcessHistory` in `@equiduty/shared`
- **API endpoint**: `POST /api/v1/selection-processes/compute-order` for previewing turn order before creation
