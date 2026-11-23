-- Inventory integrity: prevent overlapping inventory-holding reservations at the
-- database level, using a GiST exclusion constraint. Application logic alone is
-- insufficient under concurrency; this makes double-booking impossible even if
-- two transactions race.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. No two inventory-holding rows may cover the same unit on overlapping dates.
ALTER TABLE "ReservationUnit"
  ADD CONSTRAINT "reservation_unit_no_overlap"
  EXCLUDE USING gist (
    "unitId" WITH =,
    daterange("checkIn", "checkOut", '[)') WITH &&
  ) WHERE ("occupiesInventory");

-- 2. Keep `occupiesInventory` derived from the reservation status so the
--    constraint above reflects booking state automatically.
CREATE OR REPLACE FUNCTION remtops_inventory_holding(status_value text)
RETURNS boolean AS $$
BEGIN
  RETURN status_value IN (
    'PENDING_PAYMENT',
    'PENDING_APPROVAL',
    'CONFIRMED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'DISPUTED',
    'REFUND_PENDING'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION remtops_set_unit_inventory_flag()
RETURNS trigger AS $$
BEGIN
  SELECT remtops_inventory_holding(r.status::text)
    INTO NEW."occupiesInventory"
    FROM "Reservation" r
   WHERE r.id = NEW."reservationId";

  NEW."occupiesInventory" := COALESCE(NEW."occupiesInventory", false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reservation_unit_inventory_before_insert"
  BEFORE INSERT ON "ReservationUnit"
  FOR EACH ROW EXECUTE FUNCTION remtops_set_unit_inventory_flag();

CREATE OR REPLACE FUNCTION remtops_sync_unit_inventory_flag()
RETURNS trigger AS $$
BEGIN
  IF NEW.status::text IS DISTINCT FROM OLD.status::text THEN
    UPDATE "ReservationUnit"
       SET "occupiesInventory" = remtops_inventory_holding(NEW.status::text)
     WHERE "reservationId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reservation_inventory_after_update"
  AFTER UPDATE OF status ON "Reservation"
  FOR EACH ROW EXECUTE FUNCTION remtops_sync_unit_inventory_flag();

-- 3. Fast availability lookups.
CREATE INDEX IF NOT EXISTS "ReservationUnit_unitId_dates_idx"
  ON "ReservationUnit" ("unitId", "checkIn", "checkOut")
  WHERE "occupiesInventory";

CREATE INDEX IF NOT EXISTS "AvailabilityBlock_unit_dates_idx"
  ON "AvailabilityBlock" ("unitId", "startDate", "endDate");
