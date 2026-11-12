import { test as base } from "@playwright/test";

const TEST_ADMIN_USER = {
  id: "syno_เสกพล",
  prefix: "นาย",
  firstName: "เสกพล",
  lastName: "ดิษฐโชติ",
  name: "นายเสกพล ดิษฐโชติ",
  personnelType: "ข้าราชการ",
  position: "นักพัฒนาสังคมชำนาญการ",
  division: "ฝ่ายบริหารทั่วไป",
  department: "ฝ่ายบริหารทั่วไป",
  email: "user_x9w48l@nas.local",
  phone: "-",
  lineId: "-",
  role: "admin",
  status: "active",
  avatarText: "สพ",
  joinedDate: "1 พ.ย. 2569",
};

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Inject active Admin session using real Supabase account ID without seeding mock member caches
    await context.addInitScript((adminUser) => {
      const sessionData = JSON.stringify({
        user: adminUser,
        loginTime: "09:00 น.",
        rememberMe: true,
      });
      localStorage.setItem("smartmso_auth_session", sessionData);
      localStorage.setItem("omnioffice_auth_session", sessionData);
      localStorage.removeItem("smartmso_members_cache_v3");
    }, TEST_ADMIN_USER);

    await use(page);
  },
});

export { expect } from "@playwright/test";
