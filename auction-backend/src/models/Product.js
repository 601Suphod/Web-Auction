import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    images: [{ type: String }],
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    startPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
