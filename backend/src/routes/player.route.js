import express from "express";
import {
  getProfile,
  getMyValorantProfile,
} from "../controllers/player.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/profile/:name/:tag", getProfile);
router.get("/my-profile/", verifyToken, getMyValorantProfile);

export default router;
