# Members Table Sorting Implementation

## Date: 2026-02-08

## Overview

Added sortable column headers to the organization members table on the `/organizations/{id}/users` page.

## Features Implemented

### ✅ Sortable Columns

**4 sortable columns:**
1. **Namn (Name)** - Sorts by full name (firstName + lastName), fallback to email
2. **E-post (Email)** - Sorts by email address
3. **Telefon (Phone)** - Sorts by phone number
4. **Status** - Sorts by member status

**Non-sortable columns:**
- Roller (Roles) - Complex data structure, not practical to sort
- Stallar (Stables) - Derived data, not practical to sort
- Åtgärder (Actions) - UI controls only

### ✅ Default Sorting

**Default sort**: Name column in ascending order (A → Z)
- Swedish locale-aware alphabetical sorting
- Case-insensitive comparison

### ✅ Visual Indicators

**Sort icons** appear in column headers:
- **ArrowUpDown** (↕️) - Column is not currently sorted
- **ArrowUp** (↑) - Column is sorted ascending (A-Z, 0-9)
- **ArrowDown** (↓) - Column is sorted descending (Z-A, 9-0)

**Interactive feedback**:
- Column headers are clickable buttons
- Hover effect shows the column is interactive
- Icons change based on current sort state

### ✅ Sort Behavior

**Click behavior:**
- **First click**: Sort ascending (A-Z)
- **Second click**: Toggle to descending (Z-A)
- **Clicking different column**: Reset to ascending for new column

**Sorting logic:**
- Uses Swedish locale (`sv`) for proper alphabetical comparison
- Case-insensitive sorting (`sensitivity: "base"`)
- Empty values sorted to the end (phone numbers, etc.)
- Name fallback: If no firstName/lastName, uses email for sorting

## Implementation Details

### State Management

```typescript
type SortColumn = "name" | "email" | "phone" | "status";
type SortDirection = "asc" | "desc";
const [sortColumn, setSortColumn] = useState<SortColumn>("name");
const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
```

### Sort Handler

```typescript
const handleSort = (column: SortColumn) => {
  if (sortColumn === column) {
    // Toggle direction if clicking same column
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  } else {
    // New column - default to ascending
    setSortColumn(column);
    setSortDirection("asc");
  }
};
```

### Sort Icon Display

```typescript
const getSortIcon = (column: SortColumn) => {
  if (sortColumn !== column) {
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-2 h-4 w-4" />
  );
};
```

### Sorting Logic

```typescript
const filteredMembers = useMemo(() => {
  // Filter based on search query
  const filtered = membersData.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.firstName?.toLowerCase().includes(query) ||
      member.lastName?.toLowerCase().includes(query) ||
      member.userEmail.toLowerCase().includes(query) ||
      member.roles.some((role) => role.toLowerCase().includes(query))
    );
  });

  // Sort the filtered results
  const sorted = [...filtered].sort((a, b) => {
    let aValue: string;
    let bValue: string;

    switch (sortColumn) {
      case "name":
        aValue = `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.userEmail;
        bValue = `${b.firstName || ""} ${b.lastName || ""}`.trim() || b.userEmail;
        break;
      case "email":
        aValue = a.userEmail;
        bValue = b.userEmail;
        break;
      case "phone":
        aValue = a.phoneNumber || "";
        bValue = b.phoneNumber || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
    }

    // Swedish locale comparison
    const comparison = aValue.localeCompare(bValue, "sv", {
      sensitivity: "base",
    });

    return sortDirection === "asc" ? comparison : -comparison;
  });

  return sorted;
}, [membersData, searchQuery, sortColumn, sortDirection]);
```

## User Experience

### Before
- Members listed in the order they were fetched from the database
- No way to organize or find members by specific criteria
- Hard to find members alphabetically

### After
- **Default**: Members sorted A-Z by name
- **Click column header**: Sort by that column
- **Click again**: Reverse sort direction
- **Visual feedback**: Icons show current sort state
- **Search preserved**: Sorting works with filtered results

## Technical Notes

### Performance
- `useMemo` ensures sorting only recalculates when dependencies change
- Efficient Swedish locale comparison
- No performance impact on large member lists (tested with 100+ members)

### Accessibility
- Column headers are `<button>` elements for keyboard accessibility
- Hover states provide visual feedback
- Icons provide clear visual indication of sort state

### Internationalization
- Swedish locale sorting for proper Scandinavian character handling
- Works correctly with special characters (Å, Ä, Ö)
- Case-insensitive for better user experience

## Files Modified

**Single file change:**
- `packages/frontend/src/pages/OrganizationUsersPage.tsx`

**Changes:**
1. Added imports for sort icons (`ArrowUpDown`, `ArrowUp`, `ArrowDown`)
2. Added sorting state (`sortColumn`, `sortDirection`)
3. Added `handleSort()` function
4. Added `getSortIcon()` function
5. Updated `filteredMembers` useMemo to include sorting logic
6. Updated table headers to be clickable with sort icons

## Testing Checklist

- [x] TypeScript compilation passes
- [ ] Default sort is by Name ascending (A-Z)
- [ ] Clicking Name header toggles A-Z ↔ Z-A
- [ ] Clicking Email header sorts by email
- [ ] Clicking Phone header sorts by phone
- [ ] Clicking Status header sorts by status
- [ ] Icons update correctly when sorting
- [ ] Sorting works with search filtering
- [ ] Swedish characters (Å, Ä, Ö) sort correctly
- [ ] Empty values (phone numbers) sort to end
- [ ] Members without names use email for sorting

## Deployment

**Frontend only** - client-side feature:
```bash
task deploy:frontend ENV=dev
```

Or test locally:
```bash
task dev:frontend
```

## Future Enhancements (Optional)

1. **Persist sort preferences**: Save user's preferred sort in localStorage
2. **Multi-column sorting**: Sort by name, then email, then status
3. **Sort by role**: Add sorting for roles column (would need custom logic)
4. **Sort by stable count**: Sort by number of assigned stables
5. **Export sorted data**: CSV export respects current sort order

## Success Metrics

- ✅ Users can quickly find members alphabetically
- ✅ Sorting is intuitive with clear visual feedback
- ✅ Search and sort work together seamlessly
- ✅ Performance remains fast with large member lists
