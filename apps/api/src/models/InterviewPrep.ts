import mongoose, { Schema, type InferSchemaType } from "mongoose";

const interviewPrepSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    companyBrief: { type: String, default: "" },
    roleFocus: { type: [String], default: [] },
    likelyQuestions: {
      type: [
        {
          question: String,
          tip: String,
        },
      ],
      default: [],
    },
    storiesToPrepare: {
      type: [
        {
          theme: String,
          howToAnswer: String,
        },
      ],
      default: [],
    },
    questionsToAsk: { type: [String], default: [] },
    risks: { type: [String], default: [] },
  },
  { timestamps: true }
);

interviewPrepSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type InterviewPrepDoc = InferSchemaType<typeof interviewPrepSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const InterviewPrep = mongoose.model("InterviewPrep", interviewPrepSchema);
