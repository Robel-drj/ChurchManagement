import { Router } from "express";

import {
  chapaWebhook,
  chapaCallback,
  chapaReturn,
} from "./chapa-notification.controller.js";

const router = Router();

router.post("/webhook", chapaWebhook);
router.get("/callback", chapaCallback);
router.get("/return", chapaReturn);
router.post("/callback", chapaCallback);
export default router;
