import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Inject active Admin session so tests start directly in authenticated state
    await context.addInitScript(() => {
      const adminUser = {
        id: "usr_1",
        prefix: "นางสาว",
        firstName: "มะลิวัน",
        lastName: "สิทธิโยธี",
        name: "นางสาวมะลิวัน สิทธิโยธี",
        personnelType: "ข้าราชการ",
        position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        division: "ฝ่ายบริหารทั่วไป",
        department: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        email: "maliwan.s@m-society.go.th",
        phone: "055-705031",
        lineId: "@maliwan_kpp",
        role: "admin",
        status: "active",
        joinedDate: "1 ม.ค. 2565",
        avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg",
        avatarText: "มล",
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
