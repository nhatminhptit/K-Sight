import express from "express";
import {
  register,
  login,
  googleLogin,
  getMe,
  updateRiotId,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/me", verifyToken, getMe);
router.put("/riot-id", verifyToken, updateRiotId);

export default router;
