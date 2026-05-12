import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    provider: { type: String, enum: ["stripe", "omise", "promptpay", "bank", "card"], default: "bank" },
    status: { type: String, enum: ["PENDING", "AWAITING_VERIFICATION", "PAID", "FAILED"], default: "PENDING", index: true },
    amount: { type: Number, required: true },
    providerRef: { type: String, unique: true, sparse: true, index: true },
    slipNote: { type: String, default: "" },
    rejectedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
