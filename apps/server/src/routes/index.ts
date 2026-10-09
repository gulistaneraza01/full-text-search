import { Router } from "express";
import { healthController } from "../controllers/health.controller";

export const router = Router();

router.get("/health", healthController);
