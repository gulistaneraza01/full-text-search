-- CreateTable
CREATE TABLE "product_outbox" (
    "id" BIGSERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_outbox_pkey" PRIMARY KEY ("id")
);

-- Every write to "products" records the product id in the outbox, atomically with the write.
-- Catches all writers (API, Prisma Studio, raw SQL), not just the app.
CREATE FUNCTION products_outbox_trigger() RETURNS trigger AS $$
BEGIN
  INSERT INTO "product_outbox" ("product_id")
  VALUES (CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_outbox
AFTER INSERT OR UPDATE OR DELETE ON "products"
FOR EACH ROW EXECUTE FUNCTION products_outbox_trigger();
