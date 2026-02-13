#!/bin/bash
#
# Test iOS Routine Instance Detail Modal Implementation
# Runs build verification and lists testing checklist
#

set -e

echo "======================================"
echo "iOS Routine Detail Modal - Test Suite"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build verification
echo "Step 1: Build Verification"
echo "--------------------------"
cd /Users/p950xam/Utv/stall-bokning/EquiDuty

if xcodebuild -scheme EquiDuty -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo "❌ Build failed - check Xcode for errors"
    exit 1
fi

echo ""

# Step 2: Verify new files exist
echo "Step 2: File Verification"
echo "-------------------------"

files=(
    "EquiDuty/Features/Schedule/RoutineInstanceDetailView.swift"
    "EquiDuty/Features/Schedule/RoutineInstanceDetailViewModel.swift"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo "❌ Missing: $file"
    fi
done

echo ""

# Step 3: Verify API endpoints added
echo "Step 3: API Endpoints Verification"
echo "-----------------------------------"

if grep -q "routineInstanceAssign" EquiDuty/Core/Networking/APIEndpoints.swift; then
    echo -e "${GREEN}✅${NC} Assign endpoint added"
else
    echo "❌ Missing: Assign endpoint"
fi

if grep -q "routineInstanceCancel" EquiDuty/Core/Networking/APIEndpoints.swift; then
    echo -e "${GREEN}✅${NC} Cancel endpoint added"
else
    echo "❌ Missing: Cancel endpoint"
fi

echo ""

# Step 4: Verify localization strings
echo "Step 4: Localization Strings"
echo "----------------------------"

loc_keys=(
    "routineDetails.title"
    "routineDetails.actions.reassign"
    "routineDetails.actions.cancel"
    "routineDetails.error.notFound"
)

for key in "${loc_keys[@]}"; do
    if grep -q "\"$key\"" EquiDuty/Resources/Localizable.xcstrings; then
        echo -e "${GREEN}✅${NC} $key"
    else
        echo "❌ Missing: $key"
    fi
done

echo ""
echo "======================================"
echo "Manual Testing Checklist"
echo "======================================"
echo ""
echo "Run the app and test the following scenarios:"
echo ""
echo "1. Basic Member (No manage_schedules permission):"
echo "   [ ] Tap routine card → Detail modal opens"
echo "   [ ] See status, assignment, progress"
echo "   [ ] See 'Start Routine' button (if applicable)"
echo "   [ ] No 'Reassign' button visible"
echo "   [ ] No 'Cancel' or 'Delete' buttons (unless assigned)"
echo ""
echo "2. Manager (Has manage_schedules permission):"
echo "   [ ] Tap scheduled routine → See all action buttons"
echo "   [ ] Tap 'Reassign' → Member list opens"
echo "   [ ] Select member → Confirmation alert"
echo "   [ ] Confirm → Assignment updates"
echo "   [ ] Tap 'Cancel' → Confirmation alert"
echo "   [ ] Confirm → Status changes to cancelled"
echo "   [ ] Tap cancelled routine → See 'Delete' button"
echo "   [ ] Tap 'Delete' → Confirmation alert"
echo "   [ ] Confirm → Routine disappears from schedule"
echo ""
echo "3. Assignee (Assigned to routine):"
echo "   [ ] Tap own routine → See 'Cancel' button"
echo "   [ ] Cancel own routine → Works"
echo "   [ ] No 'Reassign' or 'Delete' buttons"
echo ""
echo "4. Edge Cases:"
echo "   [ ] Tap completed routine → No action buttons"
echo "   [ ] Tap missed routine → No action buttons"
echo "   [ ] Network error → Error view with retry"
echo "   [ ] Rapid button taps → Disabled during operation"
echo ""
echo "5. Navigation:"
echo "   [ ] Tap 'Start Routine' → RoutineFlowView opens"
echo "   [ ] Modal dismisses properly"
echo "   [ ] Tap 'Close' → Returns to schedule"
echo ""
echo -e "${YELLOW}Note:${NC} Test with different user roles and routine statuses"
echo ""
