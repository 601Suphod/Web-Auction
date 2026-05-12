import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true, index: true },
    currentBid: { type: Number, required: true, min: 0 },
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["SCHEDULED", "LIVE", "ENDED"], default: "SCHEDULED", index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Auction", auctionSchema);
