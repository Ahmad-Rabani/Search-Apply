import mongoose, { Schema, type InferSchemaType } from "mongoose";

const agentRunSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    synced: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
    tailored: { type: Number, default: 0 },
    jobIds: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    summary: { type: String, default: "" },
    trigger: { type: String, enum: ["manual", "schedule"], default: "manual" },
  },
  { timestamps: true }
);

export type AgentRunDoc = InferSchemaType<typeof agentRunSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const AgentRun = mongoose.model("AgentRun", agentRunSchema);
