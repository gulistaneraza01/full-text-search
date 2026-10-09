import type { Request, Response } from "express";
import { getHealth } from "../services/health.service";

export function healthController(_req: Request, res: Response) {
  res.json(getHealth());
}
