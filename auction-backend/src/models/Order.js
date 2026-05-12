import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true, unique: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "AWAITING_VERIFICATION", "PAID", "SHIPPED", "DELIVERED"], default: "PENDING", index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
