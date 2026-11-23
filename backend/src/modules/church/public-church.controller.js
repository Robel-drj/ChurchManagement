import { registerChurchMember } from "./member.service.js";
import { registerMemberSchema } from "./member.validation.js";
import { listActiveChurches } from "./public-church.service.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getActiveChurches(req, res, next) {
  try {
    const churches = await listActiveChurches();

    return res.status(200).json({
      success: true,
      message: "Active churches retrieved successfully.",
      data: churches,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerPublicMember(req, res, next) {
  try {
    const { churchId } = req.params;

    if (!UUID_REGEX.test(churchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID.",
      });
    }

    const validation = registerMemberSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member information.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await registerChurchMember(
      churchId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Registration completed successfully. You can now sign in.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}