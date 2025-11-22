// lib/auth.js
import jwt from "jsonwebtoken";

export function getUserFromRequest(request) {
  const token = request.cookies.get("hotel_saas_token")?.value;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: payload.sub, email: payload.email };
  } catch (err) {
    return null;
  }
}
