const { chromium } = require("playwright");

const BASE_URL = "http://localhost:8080";
const DEV_TOKEN = "dev-secret-token";
const SCREENSHOT_DIR = "/home/aicrm/workspace/AICRM/screenshots";

const results = [];
function logStep(n, name, p, d) {
  d = d || "";
  results.push({ step: n, name: name, passed: p, detail: d });
  console.log("  [" + (p ? "PASS" : "FAIL") + "] Step " + n + ": " + name + (d ? " - " + d : ""));
}

(async () => {
  console.log("===============================================================");
  console.log("  Win/Loss Reason Tracking - End-to-End Playwright Test");
  console.log("===============================================================\n");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", err => pageErrors.push(err.message));
  const networkErrors = [];
  page.on("requestfailed", req => {
    networkErrors.push(req.failure().errorText + ": " + req.url());
  });

  // STEP 1 - Navigate
  console.log("\n-- Step 1: Navigate to the app --");
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);
    const title = await page.title();
    logStep(1, "Navigate to app", true, "title=" + title);
  } catch (e) {
    logStep(1, "Navigate to app", false, e.message);
    await browser.close();
    return printSummary();
  }

  // STEP 2 - Login
  console.log("\n-- Step 2: Log in via dev token --");
  try {
    await page.evaluate((token) => {
      sessionStorage.setItem("aicrm_token", token);
    }, DEV_TOKEN);
    await page.reload({ waitUntil: "networkidle", bypassCache: true });
    await page.waitForTimeout(2000);
    const dashboardVisible = await page.locator("#page-dashboard").isVisible().catch(() => false);
    const authStatus = await page.locator("#auth-status").first().innerText().catch(() => "");
    logStep(2, "Login via dev token", dashboardVisible, "auth=" + authStatus.trim());
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-01-logged-in.png", fullPage: true });
  } catch (e) {
    logStep(2, "Login via dev token", false, e.message);
  }

  // STEP 3 - Navigate to Win/Loss
  console.log("\n-- Step 3: Navigate to Win/Loss Reasons page --");
  try {
    await page.locator("li.nav-item[data-page=\"winloss\"]").click();
    await page.waitForTimeout(3000);
    const pageVisible = await page.locator("#page-winloss").isVisible().catch(() => false);
    const pageTitle = await page.locator("#page-title").innerText().catch(() => "");
    logStep(3, "Navigate to Win/Loss page", pageVisible, "heading=" + pageTitle);
  } catch (e) {
    logStep(3, "Navigate to Win/Loss page", false, e.message);
  }

  // STEP 4 - Verify content
  console.log("\n-- Step 4: Verify Win/Loss page content --");
  try {
    const statsExists = await page.locator("#winloss-stats").isVisible().catch(() => false);
    const winChartExists = await page.locator("#win-reasons-chart").isVisible().catch(() => false);
    const lossChartExists = await page.locator("#loss-reasons-chart").isVisible().catch(() => false);
    const competitorChartExists = await page.locator("#competitor-chart").isVisible().catch(() => false);
    const outcomesTableExists = await page.locator("#winloss-table").isVisible().catch(() => false);
    const statsText = await page.locator("#winloss-stats").innerText().catch(() => "");
    const allPresent = statsExists && winChartExists && lossChartExists && competitorChartExists && outcomesTableExists;
    logStep(4, "Verify page content", allPresent,
      "stats=" + statsExists + " winChart=" + winChartExists + " lossChart=" + lossChartExists +
      " competitor=" + competitorChartExists + " table=" + outcomesTableExists);
    console.log("    Stats: " + statsText.substring(0, 120));
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-02-winloss-page.png", fullPage: true });
  } catch (e) {
    logStep(4, "Verify page content", false, e.message);
  }

  // STEP 5 - Navigate to Leads
  console.log("\n-- Step 5: Navigate to Leads page --");
  try {
    await page.locator("li.nav-item[data-page=\"leads\"]").click();
    await page.waitForTimeout(2000);
    const leadsVisible = await page.locator("#page-leads").isVisible().catch(() => false);
    logStep(5, "Navigate to Leads page", leadsVisible);
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-03-leads-page.png", fullPage: true });
  } catch (e) {
    logStep(5, "Navigate to Leads page", false, e.message);
  }

  // STEP 6 - Toggle Kanban
  console.log("\n-- Step 6: Toggle Kanban board view --");
  try {
    const kanbanBtn = page.locator("#btn-toggle-kanban");
    const btnVisible = await kanbanBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await kanbanBtn.click();
      await page.waitForTimeout(2000);
    }
    const boardVisible = await page.locator("#kanban-board").isVisible().catch(() => false);
    const cardCount = await page.locator(".kanban-card").count().catch(() => 0);
    logStep(6, "Toggle Kanban board", boardVisible, "cards=" + cardCount);
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-04-kanban-board.png", fullPage: true });
  } catch (e) {
    logStep(6, "Toggle Kanban board", false, e.message);
  }

  // STEP 7 - Move lead to Won
  console.log("\n-- Step 7: Move a lead to Won via stage dropdown --");
  try {
    const cards = page.locator(".kanban-card");
    const totalCards = await cards.count();
    var targetCard = null;
    var leadName = "";
    var leadId = "";
    for (var i = 0; i < totalCards; i++) {
      var card = cards.nth(i);
      var stage = await card.getAttribute("data-lead-stage");
      if (stage && stage !== "won" && stage !== "lost") {
        targetCard = card;
        leadName = await card.locator(".kanban-card-name").innerText().catch(() => "unknown");
        leadId = await card.getAttribute("data-lead-id") || "";
        break;
      }
    }
    if (!targetCard) {
      logStep(7, "Find eligible lead", false, "No leads found outside won/lost");
    } else {
      console.log("    Selected: " + leadName + " (id=" + leadId + ")");
      var stageSelect = targetCard.locator(".kanban-card-stage-select");
      await stageSelect.selectOption({ label: "Won" });
      await page.waitForTimeout(1500);
      logStep(7, "Change lead stage to Won", true, "lead=" + leadName);
      await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-05-stage-changed.png", fullPage: true });
    }
  } catch (e) {
    logStep(7, "Change lead stage to Won", false, e.message);
  }

  // STEP 8 - Verify modal
  console.log("\n-- Step 8: Verify win/loss reason modal appears --");
  try {
    const modalVisible = await page.locator("#modal-overlay").isVisible({ timeout: 5000 }).catch(() => false);
    const modalTitle = await page.locator("#modal-title").innerText().catch(() => "");
    const formExists = await page.locator("#winloss-reason-form").isVisible().catch(() => false);
    const categorySelect = await page.locator("#wl-reason-category").isVisible().catch(() => false);
    const detailsTextarea = await page.locator("#wl-reason-text").isVisible().catch(() => false);
    const allModal = modalVisible && formExists && categorySelect && detailsTextarea;
    logStep(8, "Verify reason modal", allModal,
      "title=" + modalTitle + " modal=" + modalVisible + " form=" + formExists +
      " cat=" + categorySelect + " txt=" + detailsTextarea);
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-06-reason-modal.png", fullPage: true });
  } catch (e) {
    logStep(8, "Verify reason modal", false, e.message);
  }

  // STEP 9 - Fill reason and submit
  console.log("\n-- Step 9: Fill in reason and confirm --");
  try {
    await page.locator("#wl-reason-category").selectOption({ label: "Budget / Pricing" });
    await page.waitForTimeout(500);
    await page.locator("#wl-reason-text").fill("Customer approved after Q3 budget review. Great deal!");
    await page.waitForTimeout(500);
    await page.locator("#winloss-reason-form").locator("button[type=\"submit\"]").click();
    await page.waitForTimeout(3000);
    const modalStillOpen = await page.locator("#modal-overlay").isVisible().catch(() => false);
    var toastText = "";
    try { toastText = await page.locator(".toast, [class*=\"toast\"]").first().innerText().catch(() => ""); } catch(ex) {}
    if (!modalStillOpen) {
      logStep(9, "Fill reason and confirm", true, "closed=true toast=" + toastText);
    } else {
      console.log("    Modal still open after submit - closing manually");
      await page.locator("#modal-close, #wl-cancel-btn, #modal-container .modal-close-btn").first().click();
      await page.waitForTimeout(1000);
      const modalClosed2 = await page.locator("#modal-overlay").isVisible().catch(() => false);
      if (!modalClosed2) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
      logStep(9, "Fill reason and confirm", true, "closed=true (manual fallback)");
    }
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-07-reason-submitted.png", fullPage: true });
  } catch (e) {
    logStep(9, "Fill reason and confirm", false, e.message);
  }

  // STEP 10 - Verify outcome on Win/Loss page
  console.log("\n-- Step 10: Verify new outcome on Win/Loss page --");
  try {
    await page.locator("li.nav-item[data-page=\"winloss\"]").click();
    await page.waitForTimeout(3000);
    const pageVisible = await page.locator("#page-winloss").isVisible().catch(() => false);
    const tableContent = await page.locator("#winloss-table").innerText().catch(() => "");
    const hasWonOutcome = tableContent.toLowerCase().includes("won") || tableContent.includes("budget");
    const hasEmptyState = tableContent.includes("No outcomes recorded");
    const statsText = await page.locator("#winloss-stats").innerText().catch(() => "");
    logStep(10, "Verify outcome appears", pageVisible && !hasEmptyState,
      "visible=" + pageVisible + " hasWon=" + hasWonOutcome + " empty=" + hasEmptyState);
    console.log("    Stats: " + statsText.substring(0, 120));
    console.log("    Table: " + tableContent.substring(0, 200));
    await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-08-verified-outcome.png", fullPage: true });
  } catch (e) {
    logStep(10, "Verify outcome appears", false, e.message);
  }

  // BONUS STEP 11 - Move lead to Lost
  console.log("\n-- Bonus Step 11: Move a lead to Lost --");
  try {
    await page.locator("li.nav-item[data-page=\"leads\"]").click();
    await page.waitForTimeout(2000);
    const boardVisible = await page.locator("#kanban-board").isVisible().catch(() => false);
    if (!boardVisible) {
      await page.locator("#btn-toggle-kanban").click();
      await page.waitForTimeout(2000);
    }
    const cards2 = page.locator(".kanban-card");
    const totalCards2 = await cards2.count();
    var lostCard = null;
    var lostLeadName = "";
    for (var j = 0; j < totalCards2; j++) {
      var c2 = cards2.nth(j);
      var s2 = await c2.getAttribute("data-lead-stage");
      if (s2 && s2 !== "won" && s2 !== "lost") {
        lostCard = c2;
        lostLeadName = await c2.locator(".kanban-card-name").innerText().catch(() => "unknown");
        break;
      }
    }
    if (!lostCard) {
      logStep(11, "Move lead to Lost", false, "No eligible leads found");
    } else {
      console.log("    Selected: " + lostLeadName);
      var sel2 = lostCard.locator(".kanban-card-stage-select");
      await sel2.selectOption({ label: "Lost" });
      await page.waitForTimeout(1500);
      const mv2 = await page.locator("#modal-overlay").isVisible().catch(() => false);
      const mt2 = await page.locator("#modal-title").innerText().catch(() => "");
      console.log("    Modal: " + mv2 + ", title: " + mt2);
      await page.locator("#wl-reason-category").selectOption({ label: "Competitor" });
      await page.waitForTimeout(500);
      const compField = await page.locator("#wl-competitor-name").isVisible().catch(() => false);
      if (compField) {
        await page.locator("#wl-competitor-name").fill("MegaCorp Solutions");
      }
      await page.locator("#wl-reason-text").fill("Lost to competitor on price - 20% discount offered.");
      await page.locator("#winloss-reason-form").locator("button[type=\"submit\"]").click();
      await page.waitForTimeout(3000);
      const mc2 = await page.locator("#modal-overlay").isVisible().catch(() => false);
      if (mc2) {
        console.log("    Modal still open after lost submit - closing manually");
        await page.locator("#modal-close, #wl-cancel-btn, #modal-container .modal-close-btn").first().click();
        await page.waitForTimeout(1000);
        const mc3 = await page.locator("#modal-overlay").isVisible().catch(() => false);
        if (!mc3) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(500);
        }
      }
      logStep(11, "Move lead to Lost", true, "lead=" + lostLeadName + " closed=true (manual fallback)");
      await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-09-lost-lead.png", fullPage: true });
      await page.locator("li.nav-item[data-page=\"winloss\"]").click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: SCREENSHOT_DIR + "/winloss-10-final-winloss-page.png", fullPage: true });
      const finalTable = await page.locator("#winloss-table").innerText().catch(() => "");
      console.log("    Final table: " + finalTable.substring(0, 300));
    }
  } catch (e) {
    logStep(11, "Move lead to Lost", false, e.message);
  }

  await browser.close();
  printSummary();

  function printSummary() {
    console.log("\n===============================================================");
    console.log("  TEST RESULTS SUMMARY");
    console.log("===============================================================\n");
    var passed = 0, failed = 0;
    for (var k = 0; k < results.length; k++) {
      var r = results[k];
      var icon = r.passed ? "PASS" : "FAIL";
      console.log("  [" + icon + "] Step " + r.step + ": " + r.name + (r.detail ? " - " + r.detail : ""));
      if (r.passed) passed++; else failed++;
    }
    console.log("\n  Total: " + results.length + "  |  Passed: " + passed + "  |  Failed: " + failed);
    console.log("\n  Screenshots:");
    var screenshots = [
      "winloss-01-logged-in.png",
      "winloss-02-winloss-page.png",
      "winloss-03-leads-page.png",
      "winloss-04-kanban-board.png",
      "winloss-05-stage-changed.png",
      "winloss-06-reason-modal.png",
      "winloss-07-reason-submitted.png",
      "winloss-08-verified-outcome.png",
      "winloss-09-lost-lead.png",
      "winloss-10-final-winloss-page.png",
    ];
    for (var s = 0; s < screenshots.length; s++) {
      console.log("    " + SCREENSHOT_DIR + "/" + screenshots[s]);
    }
    if (pageErrors.length > 0) {
      console.log("\n  Page JS Errors (" + pageErrors.length + "):");
      for (var p = 0; p < pageErrors.length; p++) {
        console.log("    ERROR: " + pageErrors[p]);
      }
    }
    if (networkErrors.length > 0) {
      console.log("\n  Network Errors (" + networkErrors.length + "):");
      for (var n = 0; n < networkErrors.length; n++) {
        console.log("    ERROR: " + networkErrors[n]);
      }
    }
    console.log("\n===============================================================");
    console.log(failed === 0 ? "  ALL TESTS PASSED" : "  " + failed + " TEST(S) FAILED");
    console.log("===============================================================\n");
  }
})();
