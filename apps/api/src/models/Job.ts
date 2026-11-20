import mongoose, { Schema, type InferSchemaType } from "mongoose";

const jobSchema = new Schema(
  {
    source: { type: String, required: true, index: true },
    externalId: { type: String, required: true },
    title: { type: String, required: true },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    url: { type: String, default: "" },
    description: { type: String, default: "" },
    tags: { type: [String], default: [] },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    currency: { type: String },
    remote: { type: Boolean, default: true },
    postedAt: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ source: 1, externalId: 1 }, { unique: true });
jobSchema.index({ title: "text", company: "text", description: "text", tags: "text" });

export type JobDoc = InferSchemaType<typeof jobSchema> & { _id: mongoose.Types.ObjectId };
export const Job = mongoose.model("Job", jobSchema);
