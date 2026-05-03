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
    const response = await page.goto(route.path);

    expect(response?.ok(), `${route.path} should return a successful response`).toBe(true);
    await expect(page.locator("body")).toContainText(route.text);
    await expect(page.locator("body")).not.toContainText(/failed to render/i);
  });
}
