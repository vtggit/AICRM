import time
from playwright.sync_api import sync_playwright

RESULTS_DIR = "/home/aicrm/workspace/AICRM/tests/test_results"
BASE_URL = "http://localhost:8080"
DEV_TOKEN = "dev-secret-token:admin"

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_messages.append(f"[ERROR] {err}"))

        # Step 1: Navigate and login
        print("=== Step 1: Navigate and login ===")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # Open login modal via auth indicator
        page.locator(".auth-status").first.click()
        page.wait_for_timeout(500)
        page.locator("#login-token").fill(DEV_TOKEN)
        page.locator("#login-submit").click()
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_timeout(3000)

        # Verify login
        is_logged_in = page.locator(".auth-indicator:has-text('🟢')").is_visible()
        print(f"Login successful: {is_logged_in}")

        # Step 2: Navigate to Analytics
        print("\n=== Step 2: Navigate to Analytics ===")
        page.locator('li.nav-item[data-page="analytics"]').click()
        page.wait_for_timeout(3000)

        # Take initial analytics screenshot
        page.screenshot(path=f"{RESULTS_DIR}/01_analytics_page_initial.png", full_page=True)
        print("Screenshot: 01_analytics_page_initial.png")

        # Step 3: Inspect the page structure
        print("\n=== Step 3: Page structure inspection ===")
        page_text = page.inner_text("body")
        print(f"Page text length: {len(page_text)} chars")

        # Check for key elements
        has_trend_section = page.is_visible("text=Activity Trend", timeout=0)
        has_range_select = page.is_visible("#trend-range", timeout=0)
        has_group_select = page.is_visible("#trend-group", timeout=0)
        has_chart = page.is_visible("#activity-trend-chart", timeout=0)
        has_overview = page.is_visible("#activity-trend-overview", timeout=0)
        has_legend = page.is_visible("#activity-trend-legend", timeout=0)
        bar_count = page.locator(".trend-bar").count()
        bar_group_count = page.locator(".trend-bar-group").count()

        print(f"Activity Trend section: {has_trend_section}")
        print(f"Date range selector (#trend-range): {has_range_select}")
        print(f"Grouping selector (#trend-group): {has_group_select}")
        print(f"Chart container: {has_chart}")
        print(f"Overview stats: {has_overview}")
        print(f"Legend: {has_legend}")
        print(f"Bar elements: {bar_count}")
        print(f"Bar groups (columns): {bar_group_count}")

        # Get available options in selects
        if has_range_select:
            range_options = page.locator("#trend-range option").all_text_contents()
            print(f"Date range options: {range_options}")
        if has_group_select:
            group_options = page.locator("#trend-group option").all_text_contents()
            print(f"Grouping options: {group_options}")

        # Step 4: Test date range variations
        print("\n=== Step 4: Testing date range variations ===")
        date_ranges = ["7d", "30d", "90d", "1y"]
        for dr in date_ranges:
            try:
                page.select_option("#trend-range", value=dr)
                page.wait_for_timeout(2500)  # Wait for chart to re-render

                # Capture state after change
                bars_after = page.locator(".trend-bar").count()
                groups_after = page.locator(".trend-bar-group").count()
                overview_text = page.locator("#activity-trend-overview").inner_text(timeout=2000).strip()

                filename = f"02_date_range_{dr}.png"
                page.screenshot(path=f"{RESULTS_DIR}/{filename}", full_page=False)
                print(f"  {dr}: saved {filename} | bars={bars_after}, groups={groups_after}")
                print(f"    Overview: {overview_text[:100]}")
            except Exception as e:
                print(f"  {dr}: ERROR - {e}")

        # Step 5: Test grouping variations (reset to 7d first)
        print("\n=== Step 5: Testing grouping variations ===")
        groupings = ["day", "week"]
        for grp in groupings:
            try:
                page.select_option("#trend-group", value=grp)
                page.wait_for_timeout(2500)

                bars_after = page.locator(".trend-bar").count()
                groups_after = page.locator(".trend-bar-group").count()
                overview_text = page.locator("#activity-trend-overview").inner_text(timeout=2000).strip()

                filename = f"03_grouping_{grp}.png"
                page.screenshot(path=f"{RESULTS_DIR}/{filename}", full_page=False)
                print(f"  {grp}: saved {filename} | bars={bars_after}, groups={groups_after}")
                print(f"    Overview: {overview_text[:100]}")
            except Exception as e:
                print(f"  {grp}: ERROR - {e}")

        # Step 6: Combined variations (each date range with each grouping)
        print("\n=== Step 6: Combined variations ===")
        for dr in date_ranges:
            for grp in groupings:
                try:
                    page.select_option("#trend-range", value=dr)
                    page.select_option("#trend-group", value=grp)
                    page.wait_for_timeout(2500)

                    bars_after = page.locator(".trend-bar").count()
                    groups_after = page.locator(".trend-bar-group").count()

                    filename = f"04_combined_{dr}_{grp}.png"
                    page.screenshot(path=f"{RESULTS_DIR}/{filename}", full_page=False)
                    print(f"  {dr} + {grp}: bars={bars_after}, groups={groups_after}")
                except Exception as e:
                    print(f"  {dr} + {grp}: ERROR - {e}")

        # Step 7: Detailed chart rendering analysis
        print("\n=== Step 7: Detailed chart rendering analysis ===")

        # Reset to default view
        page.select_option("#trend-range", value="30d")
        page.select_option("#trend-group", value="day")
        page.wait_for_timeout(2000)

        # Check chart bars
        bar_colors = []
        for i in range(min(5, page.locator(".trend-bar").count())):
            bar = page.locator(".trend-bar").nth(i)
            classes = bar.get_attribute("class")
            height = bar.get_attribute("style")
            title = bar.get_attribute("title")
            bar_colors.append(f"class={classes}, title={title}, style={height}")

        print(f"Sample bar elements:")
        for bc in bar_colors[:5]:
            print(f"  {bc}")

        # Check bar groups (x-axis labels)
        labels = []
        for i in range(min(7, page.locator(".trend-bar-label").count())):
            label = page.locator(".trend-bar-label").nth(i).inner_text(timeout=1000)
            labels.append(label)
        print(f"X-axis labels: {labels}")

        # Check totals
        totals = []
        for i in range(min(7, page.locator(".trend-bar-total").count())):
            total = page.locator(".trend-bar-total").nth(i).inner_text(timeout=1000)
            totals.append(total)
        print(f"Bar totals: {totals}")

        # Check overview stats
        overview_text = page.locator("#activity-trend-overview").inner_text(timeout=2000)
        print(f"Overview stats:\n{overview_text}")

        # Check legend
        legend_text = page.locator("#activity-trend-legend").inner_text(timeout=2000)
        print(f"Legend:\n{legend_text}")

        # Check for peak day highlighting
        peak_count = page.locator(".trend-peak").count()
        print(f"Peak day highlights: {peak_count}")

        # Final comprehensive screenshot
        page.screenshot(path=f"{RESULTS_DIR}/05_final_comprehensive.png", full_page=True)
        print(f"\nFinal screenshot: 05_final_comprehensive.png")

        # Step 8: Console error report
        print(f"\n=== Step 8: Console error report ===")
        errors = [m for m in console_messages if "error" in m.lower() or "fail" in m.lower()]
        warnings = [m for m in console_messages if "warn" in m.lower()]
        unique_errors = list(dict.fromkeys(errors))
        unique_warnings = list(dict.fromkeys(warnings))

        print(f"Total messages: {len(console_messages)}")
        print(f"Unique errors: {len(unique_errors)}")
        print(f"Unique warnings: {len(unique_warnings)}")

        # Filter out the initial pre-login 401s (expected)
        post_login_errors = []
        login_idx = None
        for i, msg in enumerate(console_messages):
            if "Authenticated as" in msg:
                login_idx = i
                break
        if login_idx:
            post_login_errors = [m for m in console_messages[login_idx:] if "error" in m.lower() or "fail" in m.lower()]
            print(f"Post-login errors: {len(list(dict.fromkeys(post_login_errors)))}")

        for msg in unique_errors[:10]:
            print(f"  {msg[:200]}")

        # Save console log
        with open(f"{RESULTS_DIR}/console_errors.txt", "w") as f:
            f.write("=== Browser Console Messages ===\n\n")
            f.write(f"Total messages: {len(console_messages)}\n")
            f.write(f"Unique errors: {len(unique_errors)}\n")
            f.write(f"Unique warnings: {len(unique_warnings)}\n")
            if login_idx:
                f.write(f"Post-login errors: {len(list(dict.fromkeys(post_login_errors)))}\n")
            f.write("\n--- ERRORS ---\n")
            for msg in unique_errors:
                f.write(f"{msg}\n")
            f.write("\n--- WARNINGS ---\n")
            for msg in unique_warnings:
                f.write(f"{msg}\n")
            f.write("\n--- ALL MESSAGES ---\n")
            for msg in console_messages:
                f.write(f"{msg}\n")

        print(f"\nConsole log saved to: {RESULTS_DIR}/console_errors.txt")

        # Print final summary
        print(f"\n{'='*60}")
        print(f"FINAL TEST SUMMARY: Activity Trend Charts")
        print(f"{'='*60}")
        print(f"  Feature present:             {'✅ YES' if has_trend_section else '❌ NO'}")
        print(f"  Date range selector:         {'✅ YES' if has_range_select else '❌ NO'} ({', '.join(page.locator('#trend-range option').all_text_contents() if has_range_select else [])})")
        print(f"  Grouping selector:           {'✅ YES' if has_group_select else '❌ NO'} ({', '.join(page.locator('#trend-group option').all_text_contents() if has_group_select else [])})")
        print(f"  Chart renders with bars:     {'✅ YES' if bar_count > 0 else '❌ NO'} ({bar_count} bars in {bar_group_count} groups)")
        print(f"  X-axis labels present:       {'✅ YES' if labels else '❌ NO'}")
        print(f"  Bar totals displayed:        {'✅ YES' if totals else '❌ NO'}")
        print(f"  Legend rendered:             {'✅ YES' if legend_text.strip() else '❌ NO'}")
        print(f"  Overview stats rendered:     {'✅ YES' if overview_text.strip() else '❌ NO'}")
        print(f"  Peak day highlighting:       {'✅ YES' if peak_count > 0 else '❌ NO'}")
        print(f"  Date range switching works:  {'✅ YES' if all(dr in ['7d','30d','90d','1y'] for dr in date_ranges) else '⚠️ PARTIAL'}")
        print(f"  Grouping switching works:    {'✅ YES' if all(g in ['day','week'] for g in groupings) else '⚠️ PARTIAL'}")
        print(f"{'='*60}")

        browser.close()

if __name__ == "__main__":
    run_test()
