// lib/auth.js
import jwt from "jsonwebtoken";
import User from "@/models/User";

export function getUserFromRequest(request) {
  const token = request.cookies.get("hotel_saas_token")?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) return null;

  try {
    const payload = jwt.verify(token, jwtSecret);
    return {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId || null,
      role: payload.role || "owner",
    };
  } catch {
    return null;
  }
}

export async function getUserContextFromRequest(request) {
  const sessionUser = getUserFromRequest(request);
  if (!sessionUser) return null;

  if (sessionUser.organizationId) {
    return sessionUser;
  }

  const user = await User.findById(sessionUser.id).select(
    "email organizationId role"
  );

  if (!user) return null;

  return {
    id: sessionUser.id,
    email: user.email || sessionUser.email,
    organizationId: user.organizationId?.toString() || null,
    role: user.role || "owner",
  };
}
