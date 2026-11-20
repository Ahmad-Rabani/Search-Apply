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

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", userSchema);
