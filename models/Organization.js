import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Organization ||
  mongoose.model("Organization", OrganizationSchema);
