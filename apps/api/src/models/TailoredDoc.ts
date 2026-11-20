import mongoose, { Schema, type InferSchemaType } from "mongoose";

const tailoredDocSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    matchScore: { type: Number, default: 0 },
    keywords: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    coverLetter: { type: String, default: "" },
    cvHtml: { type: String, default: "" },
    cvMarkdown: { type: String, default: "" },
    atsNotes: { type: String, default: "" },
    pdfPath: { type: String },
  },
  { timestamps: true }
);

tailoredDocSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type TailoredDocDoc = InferSchemaType<typeof tailoredDocSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const TailoredDoc = mongoose.model("TailoredDoc", tailoredDocSchema);
