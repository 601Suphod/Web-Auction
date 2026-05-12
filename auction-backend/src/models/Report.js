import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["PRODUCT", "USER"], required: true },
    targetId: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
