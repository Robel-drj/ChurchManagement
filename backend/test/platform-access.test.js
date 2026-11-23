import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

const {
  PLATFORM_ADMIN_CHURCH_ACCESS_MESSAGE,
  getPermittedChurchMemberships,
  hasPlatformAdminRole,
  userHasPlatformAdminRole,
} = await import("../src/utils/platformAccess.js");
const { requireChurchPermission } = await import(
  "../src/middleware/requireChurchPermission.js"
);
const { errorHandler } = await import(
  "../src/middleware/errorHandler.js"
);

test("platform roles and church memberships remain separate", () => {
  const memberships = [{ membershipId: "membership-1" }];

  assert.equal(hasPlatformAdminRole(["super_admin"]), true);
  assert.deepEqual(
    getPermittedChurchMemberships(["super_admin"], memberships),
    []
  );
  assert.equal(
    getPermittedChurchMemberships([], memberships),
    memberships
  );
});

test("platform role lookup uses the platform role table", async () => {
  const queryable = {
    async query(sql, values) {
      assert.match(sql, /user_platform_roles/);
      assert.deepEqual(values, ["user-1", "super_admin"]);
      return { rowCount: 1 };
    },
  };

  assert.equal(
    await userHasPlatformAdminRole(queryable, "user-1"),
    true
  );
});

test("platform administrators are rejected before church permission lookup", async () => {
  const middleware = requireChurchPermission("church.dashboard.view");
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  await middleware(
    {
      params: {
        churchId: "00000000-0000-0000-0000-000000000001",
      },
      user: {
        id: "platform-user",
        isPlatformAdmin: true,
      },
    },
    response,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(response.statusCode, 403);
  assert.equal(
    response.body.message,
    PLATFORM_ADMIN_CHURCH_ACCESS_MESSAGE
  );
  assert.equal(nextCalled, false);
});

test("database role-separation violations return a conflict response", () => {
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    errorHandler(
      {
        code: "23514",
        message: "Platform Administrator accounts cannot receive church roles.",
      },
      { method: "POST", originalUrl: "/api/churches/test" },
      response,
      () => {}
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.success, false);
});
