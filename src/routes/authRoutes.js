import express from "express";
import { forgotPassword, login, register, resetPassword } from "../controllers/authController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));

export default router;
