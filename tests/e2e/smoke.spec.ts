import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", text: /mission control|agents|tasks/i },
  { path: "/agents", text: /agents/i },
  { path: "/tasks", text: /tasks|backlog|in progress/i },
  { path: "/calendar", text: /calendar/i },
  { path: "/projects", text: /projects/i },
  { path: "/system", text: /system/i },
  { path: "/radar", text: /radar/i },
];

for (const route of routes) {
  test(`${route.path} renders without the app error fallback`, async ({ page }) => {
    const hydrationWarnings: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (/hydrated but some attributes of the server rendered HTML/i.test(text)) {
        hydrationWarnings.push(text);
      }
    });

    const response = await page.goto(route.path);

    expect(response?.ok(), `${route.path} should return a successful response`).toBe(true);
    await expect(page.locator("body")).toContainText(route.text);
    await expect(page.locator("body")).not.toContainText(/failed to render/i);
    expect(hydrationWarnings, `${route.path} should not log hydration mismatch warnings`).toEqual([]);
  });
}
