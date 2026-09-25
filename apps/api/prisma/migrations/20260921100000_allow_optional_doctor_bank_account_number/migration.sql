-- Número de cuenta no es obligatorio para registrar datos de Pago Móvil.
ALTER TABLE "doctor_bank_accounts"
ALTER COLUMN "accountNumber" DROP NOT NULL;
