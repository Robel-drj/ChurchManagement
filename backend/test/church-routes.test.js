import assert from "node:assert/strict";
import test from "node:test";

// Route modules validate their configuration when imported. These placeholders
// let this unit test inspect the Express router without contacting any service.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";
process.env.JWT_ACCESS_SECRET ??= "test-secret-that-is-at-least-32-characters";
process.env.CLOUDINARY_CLOUD_NAME ??= "test";
process.env.CLOUDINARY_API_KEY ??= "test";
process.env.CLOUDINARY_API_SECRET ??= "test";

const { default: churchRoutes } = await import(
  "../src/modules/church/church.routes.js"
);

test("notification inbox route precedes the notification ID route", () => {
  const getRoutePaths = churchRoutes.stack
    .filter((layer) => layer.route?.methods.get)
    .map((layer) => layer.route.path);

  const inboxIndex = getRoutePaths.indexOf(
    "/:churchId/notifications/inbox"
  );
  const notificationIndex = getRoutePaths.indexOf(
    "/:churchId/notifications/:notificationId"
  );

  assert.notEqual(inboxIndex, -1, "notification inbox route is registered");
  assert.notEqual(
    notificationIndex,
    -1,
    "notification detail route is registered"
  );
  assert.ok(
    inboxIndex < notificationIndex,
    "fixed paths must be registered before parameterized paths"
  );
});

test("published posts expose idempotent like and unlike routes", () => {
  const likePath = "/:churchId/content/posts/published/:postId/like";
  const likeRoutes = churchRoutes.stack.filter(
    (layer) => layer.route?.path === likePath
  ).map((layer) => layer.route);

  assert.equal(likeRoutes.length, 2, "like and unlike routes are registered");
  assert.ok(likeRoutes.some((route) => route.methods.put), "PUT likes a post");
  assert.ok(
    likeRoutes.some((route) => route.methods.delete),
    "DELETE removes a post like"
  );
});
