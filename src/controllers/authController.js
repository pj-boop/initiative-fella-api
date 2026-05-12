import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
};

const hashPasswordResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generatePasswordResetToken = () => crypto.randomBytes(32).toString("hex");

const buildAuthResponseUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  profileImage: user.profileImage,
  createdAt: user.createdAt,
});

export const register = async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const username = req.body.username?.trim();
  const { password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password should be at least 6 characters long" });
  }

  if (username.length < 3) {
    return res.status(400).json({ message: "Username should be at least 3 characters long" });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  const user = new User({
    email,
    username,
    password,
    profileImage,
  });

  await user.save();

  const token = generateToken(user._id);

  return res.status(201).json({
    token,
    user: buildAuthResponseUser(user),
  });
};

export const login = async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const { password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "All fields are required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

  const token = generateToken(user._id);

  return res.status(200).json({
    token,
    user: buildAuthResponseUser(user),
  });
};


export const forgotPassword = async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ message: "email is required" });
  }

  const user = await User.findOne({ email }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

  if (user) {
    const resetToken = generatePasswordResetToken();
    user.resetPasswordTokenHash = hashPasswordResetToken(resetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    if (process.env.NODE_ENV !== "production") {
      return res.status(200).json({
        message: "If an account exists for that email, a password reset link will be sent",
        resetToken,
      });
    }
  }

  return res.status(200).json({
    message: "If an account exists for that email, a password reset link will be sent",
  });
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "token and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password should be at least 6 characters long" });
  }

  const user = await User.findOne({
    resetPasswordTokenHash: hashPasswordResetToken(token),
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  user.password = password;
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  return res.status(200).json({ message: "Password reset successful" });
};
