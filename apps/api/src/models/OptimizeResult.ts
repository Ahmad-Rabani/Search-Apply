import mongoose, { Schema, type InferSchemaType } from "mongoose";

const optimizeResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    jobDescription: { type: String, default: "" },
    matchScore: { type: Number, default: 0 },
    keywords: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    coverLetter: { type: String, default: "" },
    cvHtml: { type: String, default: "" },
    cvMarkdown: { type: String, default: "" },
    atsNotes: { type: String, default: "" },
    source: {
      type: String,
      enum: ["upload", "saved", "profile"],
      default: "profile",
    },
    pdfPath: { type: String },
  },
  { timestamps: true }
);

export type OptimizeResultDoc = InferSchemaType<typeof optimizeResultSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const OptimizeResult = mongoose.model("OptimizeResult", optimizeResultSchema);
