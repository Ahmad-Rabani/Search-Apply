import mongoose, { Schema, type InferSchemaType } from "mongoose";

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    tailoredDocId: { type: Schema.Types.ObjectId, ref: "TailoredDoc" },
    status: {
      type: String,
      enum: ["saved", "tailored", "applied", "interview", "offer", "rejected"],
      default: "saved",
    },
    notes: { type: String, default: "" },
    appliedAt: { type: Date },
    confirmationScreenshot: { type: String, default: "" },
    applyAssistAt: { type: Date },
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type ApplicationDoc = InferSchemaType<typeof applicationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const Application = mongoose.model("Application", applicationSchema);
