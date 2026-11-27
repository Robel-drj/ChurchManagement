import * as authService from "./auth.service.js";

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}
export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    const result = await authService.login(identifier, password);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body.refreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.body.refreshToken);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}