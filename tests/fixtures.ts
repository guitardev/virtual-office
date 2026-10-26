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
      const sessionData = JSON.stringify({
        user: adminUser,
        loginTime: "09:00 น.",
        rememberMe: true,
      });
      localStorage.setItem("smartmso_auth_session", sessionData);
      localStorage.setItem("omnioffice_auth_session", sessionData);

      const membersData = [
        adminUser,
        {
          id: "usr_3",
          prefix: "นาง",
          firstName: "อรัญญา",
          lastName: "เกิดสุข",
          name: "นางอรัญญา เกิดสุข",
          personnelType: "ข้าราชการ",
          position: "นักวิเคราะห์นโยบายและแผนชำนาญการ",
          division: "กลุ่มนโยบายและวิชาการ",
          department: "กลุ่มนโยบายและวิชาการ",
          email: "aranya.k@m-society.go.th",
          phone: "055-705032",
          lineId: "aranya_kpp",
          role: "member",
          status: "active",
          joinedDate: "15 ก.พ. 2565",
        },
        {
          id: "usr_4",
          prefix: "นาย",
          firstName: "ธีรเดช",
          lastName: "สมหวัง",
          name: "นายธีรเดช สมหวัง",
          personnelType: "พนักงานราชการ",
          position: "เจ้าหน้าที่พัฒนาสังคม",
          division: "ฝ่ายบริหารทั่วไป",
          department: "ฝ่ายบริหารทั่วไป",
          email: "theeradej.s@m-society.go.th",
          phone: "055-705033",
          lineId: "theeradej_kpp",
          role: "member",
          status: "active",
          joinedDate: "1 พ.ค. 2565",
        },
      ];
      localStorage.setItem("smartmso_members_cache_v3", JSON.stringify(membersData));
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";
