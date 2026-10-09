import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import { searchElasticsearch, searchPostgres, suggest } from "../controllers/search.controller";

export const router = Router();

router.get("/health", healthController);
router.get("/search/postgres", searchPostgres);
router.get("/search/elasticsearch", searchElasticsearch);
router.get("/search/suggest", suggest);
