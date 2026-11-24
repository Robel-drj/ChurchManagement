
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import invitationPublicRoutes from "./modules/platform/invitation.public.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import platformRoutes from "./modules/platform/platform.routes.js";
import churchRoutes from "./modules/church/church.routes.js";
import chapaNotificationRoutes from "./modules/payments/chapa-notification.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const configuredCorsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function validateCorsOrigin(origin, callback) {
  // Native mobile clients and server-to-server requests do not send Origin.
  if (!origin) {
    return callback(null, true);
  }

  if (configuredCorsOrigins.includes(origin)) {
    return callback(null, true);
  }

  const isLocalDevelopmentOrigin =
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (isLocalDevelopmentOrigin) {
    return callback(null, true);
  }

  return callback(new Error("This origin is not allowed by CORS."));
}

app.use(helmet());

app.use(cors({
  origin: validateCorsOrigin,
}));
app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buffer) => {
      if (req.originalUrl.startsWith("/api/payments/chapa/webhook")) {
        req.rawBody = Buffer.from(buffer);
      }
    },
  })
);

app.use("/api/churches", churchRoutes);
app.use("/api/payments/chapa", chapaNotificationRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Church Management API is running.",
  });
});

const authLimiter = rateLimit({
  windowMs: 35 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/invitations", invitationPublicRoutes);
// Platform administration
app.use("/api/platform", platformRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

app.use(errorHandler);

export default app;
