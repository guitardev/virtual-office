import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  createSessionToken,
  verifySessionToken,
  resolveRequestActor,
  SESSION_COOKIE_NAME,
} = await import("../lib/server-session.ts");

const TEST_SECRET = "unit-test-session-secret-0123456789abcdef";

function makeFakeNextRequest(cookieValue) {
  return {
    cookies: {
      get(name) {
        if (name === SESSION_COOKIE_NAME && cookieValue) {
          return { name, value: cookieValue };
        }
        return undefined;
      },
    },
  };
}

describe("Server Signed HttpOnly Session Security", () => {
  it("should sign and verify a valid session token", () => {
    const now = 1_700_000_000;
    const token = createSessionToken(
      {
        userId: "syno_ยุทธนา",
        name: "นายยุทธนา เจนจบ",
        role: "member",
        position: "เจ้าพนักงานธุรการปฏิบัติงาน",
        division: "ฝ่ายบริหารทั่วไป",
      },
      { secret: TEST_SECRET, nowSec: now, ttlSec: 3600 }
    );

    assert.ok(token);
    const verified = verifySessionToken(token, {
      secret: TEST_SECRET,
      nowSec: now + 60,
    });
    assert.ok(verified);
    assert.equal(verified.userId, "syno_ยุทธนา");
    assert.equal(verified.role, "member");
    assert.equal(verified.exp, now + 3600);
  });

  it("should reject tampered payload or signature", () => {
    const now = 1_700_000_000;
    const token = createSessionToken(
      { userId: "syno_staff", name: "Staff", role: "member" },
      { secret: TEST_SECRET, nowSec: now, ttlSec: 3600 }
    );
    const [encoded, sig] = token.split(".");

    // Attacker tries to elevate role to admin in payload
    const forgedPayload = Buffer.from(
      JSON.stringify({
        userId: "syno_staff",
        name: "Staff",
        role: "admin",
        iat: now,
        exp: now + 3600,
      }),
      "utf8"
    ).toString("base64url");

    assert.equal(
      verifySessionToken(`${forgedPayload}.${sig}`, {
        secret: TEST_SECRET,
        nowSec: now + 10,
      }),
      null
    );

    // Wrong signing secret
    assert.equal(
      verifySessionToken(`${encoded}.${sig}`, {
        secret: "different-secret",
        nowSec: now + 10,
      }),
      null
    );
  });

  it("should reject expired tokens", () => {
    const now = 1_700_000_000;
    const token = createSessionToken(
      { userId: "syno_staff", name: "Staff", role: "member" },
      { secret: TEST_SECRET, nowSec: now, ttlSec: 60 }
    );

    assert.equal(
      verifySessionToken(token, { secret: TEST_SECRET, nowSec: now + 61 }),
      null
    );
  });

  it("should ignore spoofed body actorRole/actorId when valid session cookie is present", () => {
    const prevSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = TEST_SECRET;
    try {
      const token = createSessionToken({
        userId: "syno_สมหญิง",
        name: "นางสาวสมหญิง",
        role: "member",
      });
      const req = makeFakeNextRequest(token);

      const resolved = resolveRequestActor(req, {
        actorId: "syno_admin",
        actorName: "Spoofed Admin",
        actorRole: "admin",
      });

      assert.equal(resolved.ok, true);
      if (resolved.ok) {
        assert.equal(resolved.verifiedByCookie, true);
        assert.equal(resolved.actor.id, "syno_สมหญิง");
        assert.equal(resolved.actor.role, "member");
      }
    } finally {
      if (prevSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = prevSecret;
    }
  });
});
