import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, LogoutResponse, GetMeResponse } from "@workspace/api-zod";
import { createSession, clearSession, isAuthenticated } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const expectedUsername = process.env.APP_USERNAME;
  const expectedPassword = process.env.APP_PASSWORD;

  if (username !== expectedUsername || password !== expectedPassword) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  createSession(res);
  res.json(LoginResponse.parse({ authenticated: true }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  clearSession(res);
  res.json(LogoutResponse.parse({ authenticated: false }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authenticated = isAuthenticated(req);
  res.json(GetMeResponse.parse({ authenticated }));
});

export default router;
