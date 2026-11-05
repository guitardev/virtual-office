import { test as base } from "@playwright/test";
import { OFFICIAL_OFFICE_PERSONNEL } from "../lib/office-personnel";

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Inject active Admin session so tests start directly in authenticated state
    await context.addInitScript((personnel) => {
      const adminUser = personnel.find((m: any) => m.id === "usr_2") || personnel[1];
      const sessionData = JSON.stringify({
        user: {
          ...adminUser,
          role: "admin", // Ensure tests have admin privileges for test actions
        },
        loginTime: "09:00 น.",
        rememberMe: true,
      });
      localStorage.setItem("smartmso_auth_session", sessionData);
      localStorage.setItem("omnioffice_auth_session", sessionData);
      localStorage.setItem("smartmso_members_cache_v3", JSON.stringify(personnel));
    }, OFFICIAL_OFFICE_PERSONNEL);

    await use(page);
  },
});

export { expect } from "@playwright/test";
