import mongoose, { Schema, type InferSchemaType } from "mongoose";

const preferencesSchema = new Schema(
  {
    roles: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    remoteOnly: { type: Boolean, default: true },
    minSalary: { type: Number, default: 0 },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

const agentSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    minScore: { type: Number, default: 65 },
    sources: { type: [String], default: [] },
    runHourUtc: { type: Number, default: 9 },
    autoTailor: { type: Boolean, default: true },
    maxJobsPerRun: { type: Number, default: 5 },
    notifyEmail: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunSummary: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    preferences: { type: preferencesSchema, default: () => ({}) },
    agent: { type: agentSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", userSchema);
