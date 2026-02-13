# Facility Reservations Enhancement - Testing Guide

## Overview

This guide provides testing strategies and examples for the facility reservations page enhancement. All code follows the EquiDuty testing patterns using Vitest + Testing Library for unit/integration tests and Playwright for E2E tests.

---

## 1. Unit Testing Strategy

### Components to Test

**Priority 1 (Critical User Flows)**:
- `ViewModeSelector` - View switching functionality
- `AvailabilityIndicator` - Status display logic
- `FacilityUtilizationDashboard` - Analytics calculations
- `CustomerBookingView` - Quick booking and favorites

**Priority 2 (Supporting Components)**:
- `AvailabilityGrid` - Time slot rendering and selection
- `MyUpcomingReservations` - Reservation filtering and countdown
- `QuickBookButton` - Quick booking dialog trigger
- `TodayScheduleView` - Today's schedule filtering

**Priority 3 (Charts and Visualizations)**:
- `UtilizationBarChart` - Data transformation
- `BookingTrendChart` - Trend calculations
- `PeakHoursHeatmap` - Hour distribution
- `CustomerUsageTable` - User ranking logic

### Example: ViewModeSelector Component Test

```typescript
// packages/frontend/src/components/__tests__/ViewModeSelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeSelector } from '../ViewModeSelector';
import type { ViewMode } from '@/types/viewMode';

describe('ViewModeSelector', () => {
  const mockOnChange = vi.fn();

  const availableViewModes: ViewMode[] = ['customer', 'manager', 'operations'];

  it('renders all available view modes', () => {
    render(
      <ViewModeSelector
        viewMode="customer"
        onChange={mockOnChange}
        availableViewModes={availableViewModes}
      />
    );

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Check all options are rendered
    expect(screen.getByText(/Customer View/i)).toBeInTheDocument();
    expect(screen.getByText(/Manager View/i)).toBeInTheDocument();
    expect(screen.getByText(/Operations View/i)).toBeInTheDocument();
  });

  it('calls onChange when view mode is selected', () => {
    render(
      <ViewModeSelector
        viewMode="customer"
        onChange={mockOnChange}
        availableViewModes={availableViewModes}
      />
    );

    // Open dropdown and select manager view
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText(/Manager View/i));

    expect(mockOnChange).toHaveBeenCalledWith('manager');
  });

  it('shows current view mode as selected', () => {
    const { rerender } = render(
      <ViewModeSelector
        viewMode="customer"
        onChange={mockOnChange}
        availableViewModes={availableViewModes}
      />
    );

    expect(screen.getByText(/Customer View/i)).toBeInTheDocument();

    // Change view mode
    rerender(
      <ViewModeSelector
        viewMode="manager"
        onChange={mockOnChange}
        availableViewModes={availableViewModes}
      />
    );

    expect(screen.getByText(/Manager View/i)).toBeInTheDocument();
  });
});
```

### Example: AvailabilityIndicator Component Test

```typescript
// packages/frontend/src/components/__tests__/AvailabilityIndicator.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvailabilityIndicator } from '../AvailabilityIndicator';

describe('AvailabilityIndicator', () => {
  it('renders available status with green color', () => {
    render(<AvailabilityIndicator status="available" />);

    const indicator = screen.getByText(/available/i);
    expect(indicator).toBeInTheDocument();
    expect(indicator.closest('[class*="green"]')).toBeInTheDocument();
  });

  it('renders limited status with yellow color', () => {
    render(<AvailabilityIndicator status="limited" />);

    const indicator = screen.getByText(/limited/i);
    expect(indicator).toBeInTheDocument();
    expect(indicator.closest('[class*="yellow"]')).toBeInTheDocument();
  });

  it('renders full status with red color', () => {
    render(<AvailabilityIndicator status="full" />);

    const indicator = screen.getByText(/full/i);
    expect(indicator).toBeInTheDocument();
    expect(indicator.closest('[class*="red"]')).toBeInTheDocument();
  });

  it('renders without label when showLabel is false', () => {
    render(<AvailabilityIndicator status="available" showLabel={false} />);

    expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<AvailabilityIndicator status="available" size="sm" />);
    expect(screen.getByText(/available/i)).toBeInTheDocument();

    rerender(<AvailabilityIndicator status="available" size="lg" />);
    expect(screen.getByText(/available/i)).toBeInTheDocument();
  });
});
```

### Example: Smart Defaults Utility Test

```typescript
// packages/frontend/src/utils/__tests__/bookingSmartDefaults.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSmartDefaults,
  saveLastUsedFacilityId,
  getLastUsedFacilityId,
  addToBookingHistory,
  clearBookingPreferences,
} from '../bookingSmartDefaults';

describe('bookingSmartDefaults', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getSmartDefaults', () => {
    it('returns morning time for early hours', () => {
      const facilities = [{ id: 'facility-1' }];
      const defaults = getSmartDefaults(facilities, 8); // 8 AM

      expect(defaults.startTime).toBe('09:00');
      expect(defaults.duration).toBe(60);
    });

    it('returns afternoon time for midday hours', () => {
      const facilities = [{ id: 'facility-1' }];
      const defaults = getSmartDefaults(facilities, 13); // 1 PM

      expect(defaults.startTime).toBe('14:00');
    });

    it('returns last used facility if available', () => {
      const facilities = [
        { id: 'facility-1' },
        { id: 'facility-2' },
      ];

      saveLastUsedFacilityId('facility-2');
      const defaults = getSmartDefaults(facilities, 10);

      expect(defaults.facilityId).toBe('facility-2');
    });

    it('does not return facility if not in available list', () => {
      const facilities = [{ id: 'facility-1' }];

      saveLastUsedFacilityId('facility-999');
      const defaults = getSmartDefaults(facilities, 10);

      expect(defaults.facilityId).toBeUndefined();
    });
  });

  describe('booking history', () => {
    it('adds booking to history and updates typical duration', () => {
      addToBookingHistory('facility-1', 90);
      addToBookingHistory('facility-1', 60);
      addToBookingHistory('facility-2', 120);

      const lastFacility = getLastUsedFacilityId();
      expect(lastFacility).toBe('facility-2');
    });

    it('keeps only last 20 bookings', () => {
      // Add 25 bookings
      for (let i = 0; i < 25; i++) {
        addToBookingHistory(`facility-${i}`, 60);
      }

      // Check that history is capped at 20
      const history = JSON.parse(
        localStorage.getItem('equiduty_booking_history') || '[]'
      );
      expect(history.length).toBe(20);
    });
  });
});
```

---

## 2. Integration Testing

### API Analytics Endpoint Integration

```typescript
// packages/api/src/routes/__tests__/facility-reservations.integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../../index';
import type { FastifyInstance } from 'fastify';

describe('Facility Reservations Analytics', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    // Get auth token for testing
    authToken = await getTestAuthToken();
  });

  it('returns analytics data with valid date range', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/facility-reservations/analytics',
      query: {
        stableId: 'test-stable-id',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);

    expect(data).toHaveProperty('metrics');
    expect(data.metrics).toHaveProperty('totalBookings');
    expect(data.metrics).toHaveProperty('utilizationRate');
    expect(data).toHaveProperty('facilityUtilization');
    expect(data).toHaveProperty('topUsers');
  });

  it('requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/facility-reservations/analytics',
      query: { stableId: 'test-stable-id' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('requires stable owner permission', async () => {
    const guestToken = await getGuestAuthToken();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/facility-reservations/analytics',
      query: { stableId: 'test-stable-id' },
      headers: {
        authorization: `Bearer ${guestToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
```

### View Switching Integration

```typescript
// packages/frontend/src/pages/__tests__/FacilitiesReservationsPage.integration.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FacilitiesReservationsPage } from '../FacilitiesReservationsPage';
import { TestProviders } from '@/test/TestProviders';

describe('FacilitiesReservationsPage View Switching', () => {
  it('switches between different views', async () => {
    render(
      <TestProviders>
        <FacilitiesReservationsPage />
      </TestProviders>
    );

    // Default view should be customer
    expect(screen.getByText(/Quick Book/i)).toBeInTheDocument();

    // Switch to manager view
    const viewSelector = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewSelector);
    fireEvent.click(screen.getByText(/Manager View/i));

    await waitFor(() => {
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Utilization/i)).toBeInTheDocument();
    });

    // Switch to operations view
    fireEvent.click(viewSelector);
    fireEvent.click(screen.getByText(/Operations View/i));

    await waitFor(() => {
      expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
    });
  });

  it('persists view selection in localStorage', () => {
    render(
      <TestProviders>
        <FacilitiesReservationsPage />
      </TestProviders>
    );

    // Change view
    fireEvent.click(screen.getByRole('button', { name: /view/i }));
    fireEvent.click(screen.getByText(/Manager View/i));

    // Check localStorage
    const stored = localStorage.getItem('equiduty_facility_view_mode');
    expect(stored).toBe('manager');
  });
});
```

---

## 3. E2E Testing (Playwright)

### Complete Booking Flow Test

```typescript
// e2e/facility-booking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Facility Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/facilities/reservations');
    await page.waitForLoadState('networkidle');
  });

  test('complete booking flow in customer view', async ({ page }) => {
    // Verify customer view is loaded
    await expect(page.getByText('Quick Book')).toBeVisible();

    // Click on availability grid slot
    await page.getByRole('button', { name: '09:00' }).first().click();

    // Fill in booking form
    await page.getByLabel('Facility').click();
    await page.getByRole('option', { name: 'Indoor Arena' }).click();

    await page.getByLabel('Horse').click();
    await page.getByRole('option', { name: 'Thunder' }).click();

    await page.getByRole('button', { name: 'Create Reservation' }).click();

    // Verify success message
    await expect(page.getByText('Booking created successfully')).toBeVisible();

    // Verify booking appears in upcoming reservations
    await expect(page.getByText('Indoor Arena')).toBeVisible();
    await expect(page.getByText('Thunder')).toBeVisible();
  });

  test('export analytics as CSV', async ({ page }) => {
    // Switch to manager view
    await page.getByRole('button', { name: /view/i }).click();
    await page.getByText('Manager View').click();

    // Click CSV export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/facility-analytics-.*\.csv/);
  });

  test('quick status update in operations view', async ({ page }) => {
    // Switch to operations view
    await page.getByRole('button', { name: /view/i }).click();
    await page.getByText('Operations View').click();

    // Find a booking and mark as complete
    const bookingCard = page.getByTestId('booking-card').first();
    await bookingCard.getByRole('button', { name: 'Complete' }).click();

    // Verify success
    await expect(page.getByText('Status updated successfully')).toBeVisible();
  });
});
```

### Accessibility E2E Tests

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('customer view should not have accessibility violations', async ({ page }) => {
    await page.goto('/facilities/reservations');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation works for view switcher', async ({ page }) => {
    await page.goto('/facilities/reservations');

    // Tab to view switcher
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // ... repeat until view switcher is focused

    // Open dropdown with keyboard
    await page.keyboard.press('Enter');

    // Navigate to manager view
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify view changed
    await expect(page.getByText('Analytics')).toBeVisible();
  });

  test('screen reader announces view changes', async ({ page }) => {
    await page.goto('/facilities/reservations');

    // Check for ARIA live region
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();

    // Change view
    await page.getByRole('button', { name: /view/i }).click();
    await page.getByText('Manager View').click();

    // Verify announcement
    await expect(liveRegion).toHaveText(/Manager View/i);
  });
});
```

---

## 4. Accessibility Testing Checklist

### Manual Testing

**Keyboard Navigation**:
- [ ] All interactive elements focusable with Tab key
- [ ] Focus order is logical and predictable
- [ ] Dropdowns can be opened and navigated with keyboard
- [ ] Modal dialogs trap focus correctly
- [ ] Escape key closes modals and dropdowns
- [ ] Enter/Space activates buttons and links

**Screen Reader Testing** (using NVDA/JAWS):
- [ ] View switcher announces current view
- [ ] Availability grid announces slot status
- [ ] Charts provide text alternatives
- [ ] Form fields have proper labels
- [ ] Error messages are announced
- [ ] Success messages are announced

**Color Contrast** (using axe DevTools):
- [ ] All text meets WCAG AA standards (4.5:1)
- [ ] Large text meets WCAG AA standards (3:1)
- [ ] Interactive elements have sufficient contrast
- [ ] Focus indicators are visible
- [ ] Availability colors have sufficient contrast

**Focus Management**:
- [ ] Focus visible indicator on all elements
- [ ] Focus returns to trigger after modal close
- [ ] Focus moves to first error on form validation
- [ ] Skip links work correctly

### Automated Tools

**axe DevTools** (browser extension):
```
1. Open any page with new components
2. Run axe DevTools scan
3. Fix all violations before deployment
4. Ensure 0 violations for WCAG AA compliance
```

**Lighthouse** (Chrome DevTools):
```
1. Run Lighthouse accessibility audit
2. Target score: 95+ for all pages
3. Address all flagged issues
4. Verify mobile accessibility separately
```

---

## 5. Performance Testing

### Load Testing

```typescript
// packages/frontend/src/components/__tests__/performance.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FacilityUtilizationDashboard } from '../FacilityUtilizationDashboard';

describe('Performance Tests', () => {
  it('renders large dataset efficiently', () => {
    // Generate 100 facilities and 1000 reservations
    const facilities = Array.from({ length: 100 }, (_, i) => ({
      id: `facility-${i}`,
      name: `Facility ${i}`,
      type: 'arena',
      capacity: 1,
    }));

    const reservations = Array.from({ length: 1000 }, (_, i) => ({
      id: `res-${i}`,
      facilityId: `facility-${i % 100}`,
      startTime: new Date(2024, 0, i % 30, 9, 0),
      endTime: new Date(2024, 0, i % 30, 10, 0),
      status: 'confirmed',
    }));

    const start = performance.now();
    render(
      <FacilityUtilizationDashboard
        facilities={facilities}
        reservations={reservations}
      />
    );
    const end = performance.now();

    // Should render in less than 1 second
    expect(end - start).toBeLessThan(1000);
  });
});
```

---

## 6. Test Coverage Goals

**Target Coverage**:
- Unit Tests: ≥80% for all new components
- Integration Tests: ≥70% for view switching and API integration
- E2E Tests: 100% coverage of critical user flows

**Critical Paths to Cover**:
1. ✅ View switching (Customer → Manager → Operations)
2. ✅ Quick booking from availability grid
3. ✅ Analytics data export (CSV + PDF)
4. ✅ Status updates in operations view
5. ✅ Smart defaults persistence

**Run Test Suite**:
```bash
# Unit + Integration tests
cd packages/frontend && npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 7. Testing Priorities

**Before Deployment (Must Have)**:
- [x] Unit tests for ViewModeSelector
- [x] Unit tests for AvailabilityIndicator
- [x] Unit tests for smart defaults utilities
- [ ] Integration test for view switching
- [ ] E2E test for complete booking flow
- [ ] Accessibility scan with axe DevTools (0 violations)

**Post-Deployment (Should Have)**:
- [ ] Unit tests for all chart components
- [ ] Integration tests for analytics API
- [ ] E2E tests for export functionality
- [ ] Performance tests for large datasets
- [ ] Cross-browser E2E tests (Chrome, Firefox, Safari)

**Future Enhancements (Nice to Have)**:
- [ ] Visual regression tests with Percy/Chromatic
- [ ] Load testing with k6
- [ ] Mobile E2E tests with device emulation
- [ ] Screen reader automated testing with Pa11y

---

## 8. Troubleshooting Common Test Issues

**Issue**: Tests fail due to missing translations
**Solution**: Mock react-i18next in test setup
```typescript
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));
```

**Issue**: TanStack Query tests fail
**Solution**: Wrap components in QueryClientProvider
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);
```

**Issue**: Date/time tests fail in different timezones
**Solution**: Mock date-fns or use fixed dates
```typescript
vi.mock('date-fns', () => ({
  ...vi.importActual('date-fns'),
  format: (date, formatStr) => '2024-01-15 09:00',
}));
```

---

## 9. Continuous Integration

**GitHub Actions Workflow** (`.github/workflows/test.yml`):
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Summary

This testing guide provides a comprehensive framework for validating all facility reservations enhancements. Start with critical unit tests and E2E flows, then expand coverage iteratively. Use the provided examples as templates for additional test cases.

**Next Steps**:
1. Implement Priority 1 unit tests
2. Set up integration tests for API
3. Create E2E test suite for booking flow
4. Run accessibility audit
5. Configure CI/CD pipeline
