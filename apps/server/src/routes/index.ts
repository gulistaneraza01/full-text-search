import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import * as products from "../controllers/product.controller";
import { searchElasticsearch, searchPostgres, suggest } from "../controllers/search.controller";

export const router = Router();

router.get("/health", healthController);
router.get("/search/postgres", searchPostgres);
router.get("/search/elasticsearch", searchElasticsearch);
router.get("/search/suggest", suggest);

router.get("/products", products.list);
router.post("/products", products.create);
router.get("/products/:id", products.getOne);
router.patch("/products/:id", products.update);
router.delete("/products/:id", products.remove);
