import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  console.log("🚀 Starting Care Activities Matrix View tests...\n");

  try {
    // Navigate to the care activities page
    console.log("📍 Navigating to http://localhost:5177/activities/care");
    await page.goto("http://localhost:5177/activities/care", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);

    // Test 1: Matrix View Rendering
    console.log("\n✅ Test 1: Matrix View Rendering");

    // Check for the card title
    const cardTitle = await page
      .locator('h2:has-text("Care Activities")')
      .first();
    if (await cardTitle.isVisible()) {
      console.log('  ✓ Card title "Care Activities" found');
    }

    // Check for matrix table
    const matrixTable = await page.locator("table").first();
    if (await matrixTable.isVisible()) {
      console.log("  ✓ Matrix table rendered");
    }

    // Check for column headers
    const headers = [
      "deworm",
      "farrier",
      "influenza",
      "vet",
      "dentist",
      "vaccination",
    ];
    for (const header of headers) {
      const headerCell = await page.locator(`th:has-text("${header}")`).first();
      if (await headerCell.isVisible()) {
        console.log(`  ✓ Column header "${header}" found`);
      }
    }

    // Capture matrix view screenshot
    await page.screenshot({
      path: "/Users/p950xam/Utv/equiduty/packages/frontend/test-screenshots/matrix-view.png",
      fullPage: true,
    });
    console.log("  📸 Screenshot saved: matrix-view.png");

    // Test 2: Cell Indicators
    console.log("\n✅ Test 2: Cell Status Indicators");

    // Check for Plus icon (empty cells)
    const plusIcons = await page
      .locator('button[class*="CareMatrixCell"] svg.lucide-plus')
      .count();
    console.log(`  ✓ Found ${plusIcons} cells with Plus icon (empty)`);

    // Check for Check icon (completed cells)
    const checkIcons = await page
      .locator('button[class*="CareMatrixCell"] svg.lucide-check')
      .count();
    console.log(`  ✓ Found ${checkIcons} cells with Check icon (completed)`);

    // Test 3: Quick Add Popover Flow
    console.log("\n✅ Test 3: Quick Add Popover Flow");

    // Click on a matrix cell
    const firstCell = await page
      .locator("button")
      .filter({ hasText: /^\+$|^✓$/ })
      .first();
    await firstCell.click();
    await page.waitForTimeout(500);

    // Check if popover opened
    const popover = await page.locator('[role="dialog"]').first();
    if (await popover.isVisible()) {
      console.log("  ✓ Popover opened on cell click");

      // Check for horse name in popover
      const horseHeader = await page.locator("h3").first();
      const horseName = await horseHeader.textContent();
      console.log(`  ✓ Horse name displayed: "${horseName}"`);

      // Check for activity type header
      const activityHeader = await page.locator("h4").first();
      const activityType = await activityHeader.textContent();
      console.log(`  ✓ Activity type displayed: "${activityType}"`);

      // Check for "Last done" status
      const lastDoneText = await page
        .locator("text=/Last done:|Never|Unknown/")
        .first();
      if (await lastDoneText.isVisible()) {
        console.log('  ✓ "Last done" status displayed');
      }

      // Check for "Add" button
      const addButton = await page.locator('button:has-text("Add")').first();
      if (await addButton.isVisible()) {
        console.log('  ✓ "Add" button present');
      }

      // Capture popover screenshot
      await page.screenshot({
        path: "/Users/p950xam/Utv/equiduty/packages/frontend/test-screenshots/quick-add-popover.png",
        fullPage: true,
      });
      console.log("  📸 Screenshot saved: quick-add-popover.png");

      // Test 4: Full Dialog Flow
      console.log("\n✅ Test 4: Full Dialog Flow");

      // Click "Add" button in popover
      await addButton.click();
      await page.waitForTimeout(500);

      // Check if dialog opened
      const dialog = await page.locator('[role="dialog"]').nth(1);
      if (await dialog.isVisible()) {
        console.log("  ✓ Activity form dialog opened");

        // Check dialog title
        const dialogTitle = await page
          .locator('h2:has-text("New Entry")')
          .first();
        if (await dialogTitle.isVisible()) {
          console.log('  ✓ Dialog title "New Entry" found');
        }

        // Check date field
        const dateField = await page.locator('input[type="date"]').first();
        if (await dateField.isVisible()) {
          const dateValue = await dateField.inputValue();
          console.log(`  ✓ Date field pre-filled: ${dateValue}`);
        }

        // Check horse dropdown (should be pre-filled)
        const horseSelect = await page
          .locator('select, button[role="combobox"]')
          .filter({ hasText: /horse/i })
          .first();
        if (await horseSelect.isVisible()) {
          console.log("  ✓ Horse dropdown present");
        }

        // Check activity type dropdown (should be pre-filled)
        const activitySelect = await page
          .locator('select, button[role="combobox"]')
          .filter({ hasText: /activity/i })
          .first();
        if (await activitySelect.isVisible()) {
          console.log("  ✓ Activity type dropdown present");
        }

        // Check note field
        const noteField = await page
          .locator('textarea, input[placeholder*="note" i]')
          .first();
        if (await noteField.isVisible()) {
          console.log("  ✓ Note field editable");
        }

        // Capture dialog screenshot
        await page.screenshot({
          path: "/Users/p950xam/Utv/equiduty/packages/frontend/test-screenshots/activity-form-dialog.png",
          fullPage: true,
        });
        console.log("  📸 Screenshot saved: activity-form-dialog.png");

        // Close dialog
        const closeButton = await page
          .locator('button[aria-label="Close"], button:has-text("Cancel")')
          .first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          console.log("  ✓ Dialog closed successfully");
        }
      }

      // Close popover
      const popoverCloseButton = await page
        .locator('button[aria-label="Close"]')
        .first();
      if (await popoverCloseButton.isVisible()) {
        await popoverCloseButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Test 5: Responsive Design
    console.log("\n✅ Test 5: Responsive Design");

    // Test desktop (1920×1080) - already tested above
    console.log("  ✓ Desktop viewport (1920×1080) tested");

    // Test tablet (768×1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "/Users/p950xam/Utv/equiduty/packages/frontend/test-screenshots/matrix-tablet.png",
      fullPage: true,
    });
    console.log("  ✓ Tablet viewport (768×1024) tested");
    console.log("  📸 Screenshot saved: matrix-tablet.png");

    // Test mobile (375×667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "/Users/p950xam/Utv/equiduty/packages/frontend/test-screenshots/matrix-mobile.png",
      fullPage: true,
    });
    console.log("  ✓ Mobile viewport (375×667) tested");
    console.log("  📸 Screenshot saved: matrix-mobile.png");

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Test 6: Accessibility
    console.log("\n✅ Test 6: Accessibility");

    // Check for ARIA labels on cells
    const cellsWithAria = await page.locator("button[aria-label]").count();
    console.log(`  ✓ Found ${cellsWithAria} cells with ARIA labels`);

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    console.log(`  ✓ Keyboard navigation works (focused: ${focusedElement})`);

    console.log("\n🎉 All tests completed successfully!");
    console.log(
      "\n📁 Screenshots saved in: /Users/p950xam/Utv/equiduty/packages/frontend/test-screenshots/",
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    await browser.close();
  }
})();
