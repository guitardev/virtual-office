import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Inject active Admin session so tests start directly in authenticated state
    await context.addInitScript(() => {
      const adminUser = {
        id: "usr_2",
        prefix: "นาย",
        firstName: "เสกพล",
        lastName: "ดิษฐโชติ",
        name: "นายเสกพล ดิษฐโชติ",
        personnelType: "ข้าราชการ",
        position: "นักพัฒนาสังคมชำนาญการ",
        division: "ฝ่ายบริหารทั่วไป",
        department: "ฝ่ายบริหารทั่วไป",
        email: "sekpol.d@m-society.go.th",
        phone: "055-705031",
        lineId: "sek_kpp",
        role: "admin",
        status: "active",
        joinedDate: "1 ม.ค. 2565",
        avatarUrl: "",
        avatarText: "สพ",
      };
      localStorage.setItem(
        "omnioffice_auth_session",
        JSON.stringify({
          user: adminUser,
          loginTime: "09:00 น.",
          rememberMe: true,
        })
      );
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";
