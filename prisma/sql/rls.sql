-- Row Level Security for customer-owned data.
--
-- The app connects as a non-superuser role (`app_user`) and every request that
-- touches customer data runs inside `withUser()` (src/lib/db.ts), which does
--   SELECT set_config('app.user_id', <id>, true), set_config('app.role', <role>, true)
-- for the transaction. Staff/admin requests set app.role accordingly.
-- Apply after `prisma migrate deploy`:  psql "$DIRECT_URL" -f prisma/sql/rls.sql

CREATE OR REPLACE FUNCTION app_uid() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;

-- Staff roles plus the SYSTEM context (webhooks, OTP login lookups, split-pay
-- token resolution) that runs before or without an authenticated customer.
CREATE OR REPLACE FUNCTION app_is_staff() RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.role', true), '') IN ('STAFF', 'ADMIN', 'DECORATOR', 'SYSTEM')
  $$;

-- Owner-scoped tables -----------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Address', 'CustomBox', 'Order', 'Session'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_rw ON %I', t);
    EXECUTE format(
      'CREATE POLICY owner_rw ON %I USING ("userId" = app_uid() OR app_is_staff())
                                 WITH CHECK ("userId" = app_uid() OR app_is_staff())', t);
  END LOOP;
END $$;

-- The user row itself
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS self_rw ON "User";
CREATE POLICY self_rw ON "User" USING (id = app_uid() OR app_is_staff())
                              WITH CHECK (id = app_uid() OR app_is_staff());

-- Children inherit visibility from their parent order / box ----------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['OrderLine', 'OrderEvent', 'Payment', 'DecorBooking'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS via_order ON %I', t);
    EXECUTE format(
      'CREATE POLICY via_order ON %I USING (app_is_staff() OR EXISTS (
         SELECT 1 FROM "Order" o WHERE o.id = %I."orderId" AND o."userId" = app_uid()))', t, t);
  END LOOP;
END $$;

ALTER TABLE "CustomBoxItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomBoxItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS via_box ON "CustomBoxItem";
CREATE POLICY via_box ON "CustomBoxItem" USING (app_is_staff() OR EXISTS (
  SELECT 1 FROM "CustomBox" b WHERE b.id = "CustomBoxItem"."customBoxId" AND b."userId" = app_uid()));

-- Staff-only operational tables -------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['InventoryItem', 'InventoryMovement', 'ZoneStock', 'AuditLog', 'OtpChallenge'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_only ON %I', t);
    -- OTP + audit writes happen in the SYSTEM context, which app_is_staff() covers.
    EXECUTE format('CREATE POLICY staff_only ON %I USING (app_is_staff())', t);
  END LOOP;
END $$;

-- Split-pay links are reachable by anyone holding the token; the app resolves them
-- by tokenHash in the SYSTEM context, so the table itself stays staff/owner only.
ALTER TABLE "SplitPayLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SplitPayLink" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS link_access ON "SplitPayLink";
CREATE POLICY link_access ON "SplitPayLink" USING (
  app_is_staff() OR EXISTS (
    SELECT 1 FROM "Order" o WHERE o.id = "SplitPayLink"."orderId" AND o."userId" = app_uid()));

ALTER TABLE "SplitContribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SplitContribution" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contribution_access ON "SplitContribution";
CREATE POLICY contribution_access ON "SplitContribution" USING (
  app_is_staff() OR "userId" = app_uid() OR EXISTS (
    SELECT 1 FROM "SplitPayLink" l JOIN "Order" o ON o.id = l."orderId"
    WHERE l.id = "SplitContribution"."linkId" AND o."userId" = app_uid()));
