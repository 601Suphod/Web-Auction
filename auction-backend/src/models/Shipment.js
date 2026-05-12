import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    trackingNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ["IN_TRANSIT", "DELIVERED"], default: "IN_TRANSIT" },
  },
  { timestamps: true }
);

export default mongoose.model("Shipment", shipmentSchema);
