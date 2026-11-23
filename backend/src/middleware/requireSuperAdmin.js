export async function requireSuperAdmin(req, res, next) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({
      success: false,
      message: "Platform Administrator access required.",
    });
  }

  next();
}
