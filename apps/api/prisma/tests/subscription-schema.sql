-- Run with psql -v ON_ERROR_STOP=1. All fixture changes are rolled back.
BEGIN;

CREATE FUNCTION pg_temp.assert_rejected(command TEXT, expected_state TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE command;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN
      RETURN;
    END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE % for: %', expected_state, command;
END;
$$;

DO $$
DECLARE
  tenant_a TEXT := gen_random_uuid()::TEXT;
  tenant_b TEXT := gen_random_uuid()::TEXT;
  subscription_a TEXT := gen_random_uuid()::TEXT;
  subscription_b TEXT := gen_random_uuid()::TEXT;
  plan_id TEXT := gen_random_uuid()::TEXT;
  period_a TEXT := gen_random_uuid()::TEXT;
  period_b TEXT := gen_random_uuid()::TEXT;
  invoice_id TEXT := gen_random_uuid()::TEXT;
  payment_id TEXT := gen_random_uuid()::TEXT;
  found_tenant TEXT;
BEGIN
  INSERT INTO tenants (id, name, slug, "updatedAt") VALUES
    (tenant_a, 'Subscription schema test A', tenant_a, NOW()),
    (tenant_b, 'Subscription schema test B', tenant_b, NOW());

  INSERT INTO subscription_plans
    (id, code, name, "basePriceUsd", features, limits, "updatedAt")
  VALUES (plan_id, plan_id, 'Schema test', 20.00, '{}', '{"max_doctors":5}', NOW());

  INSERT INTO tenant_subscriptions (id, "tenantId", "agreedPriceUsd", "updatedAt") VALUES
    (subscription_a, tenant_a, 20.00, NOW()),
    (subscription_b, tenant_b, 20.00, NOW());

  INSERT INTO subscription_periods
    (id, "subscriptionId", "subscriptionPlanId", "startsAt", "endsAt",
     "priceUsdSnapshot", "planCodeSnapshot", "planNameSnapshot",
     "featuresSnapshot", "limitsSnapshot")
  VALUES
    (period_a, subscription_a, plan_id, '2026-10-01', '2026-11-01', 20.00, 'BASE', 'Base', '{}', '{}'),
    (period_b, subscription_b, plan_id, '2026-10-01', '2026-11-01', 20.00, 'BASE', 'Base', '{}', '{}');

  UPDATE tenant_subscriptions SET "subscriptionPeriodId" = period_a WHERE id = subscription_a;

  INSERT INTO subscription_invoices
    (id, "subscriptionPeriodId", number, "totalUsd", "issuedAt", "dueAt")
  VALUES (invoice_id, period_a, invoice_id, 20.00, '2026-10-01', '2026-10-04');

  INSERT INTO subscription_payments
    (id, "subscriptionInvoiceId", status, "amountUsd", "paymentCurrency",
     "amountPaid", "paymentMethod", "idempotencyKey", "paidAt", "confirmedAt")
  VALUES (payment_id, invoice_id, 'CONFIRMED', 20.00, 'USD', 20.00,
    'CASH_USD', payment_id, '2026-10-01', '2026-10-01');

  SELECT subscription."tenantId" INTO found_tenant
  FROM subscription_payments payment
  JOIN subscription_invoices invoice ON invoice.id = payment."subscriptionInvoiceId"
  JOIN subscription_periods period ON period.id = invoice."subscriptionPeriodId"
  JOIN tenant_subscriptions subscription ON subscription.id = period."subscriptionId"
  WHERE payment.id = payment_id AND subscription."tenantId" = tenant_a;
  IF found_tenant IS DISTINCT FROM tenant_a THEN
    RAISE EXCEPTION 'Cannot resolve the payment tenant through its relations';
  END IF;

  PERFORM pg_temp.assert_rejected(format(
    'UPDATE tenant_subscriptions SET "subscriptionPeriodId" = %L WHERE id = %L',
    period_b, subscription_a), '23503');
  PERFORM pg_temp.assert_rejected(format(
    'INSERT INTO tenant_subscriptions (id, "tenantId", "agreedPriceUsd", "updatedAt") VALUES (%L, %L, 20, NOW())',
    gen_random_uuid()::TEXT, tenant_a), '23505');
  PERFORM pg_temp.assert_rejected(format(
    'UPDATE subscription_periods SET "endsAt" = "startsAt" WHERE id = %L', period_a), '23514');
  PERFORM pg_temp.assert_rejected(format(
    'UPDATE subscription_payments SET "amountUsd" = -1 WHERE id = %L', payment_id), '23514');
  PERFORM pg_temp.assert_rejected(format(
    'UPDATE subscription_payments SET "paymentCurrency" = ''VES'', "exchangeRateSnapshot" = NULL WHERE id = %L',
    payment_id), '23514');
  PERFORM pg_temp.assert_rejected(format(
    'INSERT INTO subscription_invoices (id, "subscriptionPeriodId", number, "totalUsd", "issuedAt", "dueAt") VALUES (%L, %L, %L, 20, NOW(), NOW())',
    gen_random_uuid()::TEXT, period_a, gen_random_uuid()::TEXT), '23505');
  PERFORM pg_temp.assert_rejected(format(
    'INSERT INTO subscription_payments (id, "subscriptionInvoiceId", "amountUsd", "paymentCurrency", "amountPaid", "paymentMethod", "idempotencyKey", "paidAt") VALUES (%L, %L, 1, ''USD'', 1, ''CASH_USD'', %L, NOW())',
    gen_random_uuid()::TEXT, invoice_id, payment_id), '23505');
  PERFORM pg_temp.assert_rejected(format(
    'DELETE FROM subscription_invoices WHERE id = %L', invoice_id), '23503');
  PERFORM pg_temp.assert_rejected(format(
    'DELETE FROM subscription_periods WHERE id = %L', period_a), '23503');
  PERFORM pg_temp.assert_rejected(format(
    'DELETE FROM tenant_subscriptions WHERE id = %L', subscription_a), '23503');
  PERFORM pg_temp.assert_rejected(format(
    'DELETE FROM tenants WHERE id = %L', tenant_a), '23503');

  -- Renewal adds a period; historical pricing survives catalog changes.
  UPDATE subscription_plans SET "basePriceUsd" = 30 WHERE id = plan_id;
  INSERT INTO subscription_periods
    (id, "subscriptionId", "subscriptionPlanId", "startsAt", "endsAt",
     "priceUsdSnapshot", "planCodeSnapshot", "planNameSnapshot",
     "featuresSnapshot", "limitsSnapshot")
  VALUES (gen_random_uuid()::TEXT, subscription_a, plan_id, '2026-11-01',
    '2026-12-01', 20.00, 'BASE', 'Base', '{}', '{}');
  IF (SELECT "priceUsdSnapshot" FROM subscription_periods WHERE id = period_a) <> 20.00 THEN
    RAISE EXCEPTION 'Changing the plan changed the historical price';
  END IF;
  IF (SELECT count(*) FROM subscription_periods WHERE "subscriptionId" = subscription_a) <> 2 THEN
    RAISE EXCEPTION 'Renewal did not preserve the previous period';
  END IF;
  RAISE NOTICE 'Subscription schema checks passed';
END;
$$;

ROLLBACK;
