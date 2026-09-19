UPDATE "payments" AS p
SET "totalPaidUsdEquivalent" = ROUND(
  (
    COALESCE((
      SELECT SUM(d."amount")
      FROM "payment_details" AS d
      WHERE d."paymentId" = p."id" AND d."currency" = 'USD'
    ), 0)
    + COALESCE((
      SELECT SUM(d."amount")
      FROM "payment_details" AS d
      WHERE d."paymentId" = p."id" AND d."currency" = 'VES'
    ), 0) / NULLIF(p."bcvExchangeRate", 0)
  )::numeric,
  2
)
WHERE p."totalPaidUsdEquivalent" = 0
  AND p."bcvExchangeRate" > 0;
