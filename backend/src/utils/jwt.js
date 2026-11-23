import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, typ: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || "25m", issuer: "church-management-api" }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: "church-management-api"
  });
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
