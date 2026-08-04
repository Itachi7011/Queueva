import { z } from "zod";

export const simulatePaymentSchema = z.object({
  outcome: z.enum(["success", "failure"]),
});
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
});
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
