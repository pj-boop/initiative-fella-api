import express from "express";
import { login, register } from "../controllers/authController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));

export default router;
