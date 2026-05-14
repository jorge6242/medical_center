export declare const RECEIPT_GENERATION_QUEUE: "receipt-generation";
export declare const RECEIPT_EMAIL_QUEUE: "receipt-email";
export interface ReceiptGenerationJobData {
    tenantId: string;
    paymentId: string;
    generatedById: string;
}
export interface ReceiptEmailJobData {
    tenantId: string;
    paymentId: string;
    recipientEmail: string;
}
