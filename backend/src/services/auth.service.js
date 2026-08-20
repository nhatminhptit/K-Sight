import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.config.js";

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });

const toPublicUser = ({ id, email, username, googleId, riotId }) => ({
  id,
  email,
  username,
  googleId,
  riotId,
});

export const registerUser = async ({ email, username, password, riotId }) => {
  if (!email || !username || !password) {
    throw createServiceError(
      "Vui lòng cung cấp email, username và password.",
      400,
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw createServiceError("Email đã được đăng ký.", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      riotId: riotId || undefined,
    },
  });

  return toPublicUser(newUser);
};

export const loginUser = async ({ username, password }) => {
  if (!username || !password) {
    throw createServiceError("Vui lòng cung cấp tài khoản và mật khẩu.", 400);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const isPasswordValid = user?.password
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!isPasswordValid) {
    throw createServiceError("Tài khoản hoặc mật khẩu không chính xác.", 401);
  }

  return { token: createToken(user.id), user: toPublicUser(user) };
};

export const loginWithGoogle = async ({ email, googleId, username }) => {
  if (!email || !googleId) {
    throw createServiceError("Vui lòng cung cấp email và googleId.", 400);
  }

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        username: username || email.split("@")[0],
        googleId,
        password: null,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId },
    });
  }

  return { token: createToken(user.id), user: toPublicUser(user) };
};

export const updateUserRiotId = async (userId, riotId) => {
  if (!riotId || !riotId.includes("#")) {
    throw createServiceError(
      "Vui lòng cung cấp Riot ID hợp lệ theo định dạng Tên#Tag.",
      400,
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { riotId: riotId.trim() },
    });

    return toPublicUser(updatedUser);
  } catch (error) {
    if (error.code === "P2025") {
      throw createServiceError("Không tìm thấy người dùng!", 404);
    }
    throw error;
  }
};

export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw createServiceError("Không tìm thấy người dùng!", 404);
  }

  return toPublicUser(user);
};
