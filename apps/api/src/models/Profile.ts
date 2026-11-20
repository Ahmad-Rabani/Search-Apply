import mongoose, { Schema, type InferSchemaType } from "mongoose";

const experienceSchema = new Schema(
  {
    title: String,
    company: String,
    location: String,
    startDate: String,
    endDate: String,
    current: { type: Boolean, default: false },
    bullets: { type: [String], default: [] },
  },
  { _id: false }
);

const educationSchema = new Schema(
  {
    school: String,
    degree: String,
    field: String,
    startDate: String,
    endDate: String,
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    name: String,
    url: String,
    description: String,
    tech: { type: [String], default: [] },
  },
  { _id: false }
);

const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, default: "" },
    headline: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    website: { type: String, default: "" },
    summary: { type: String, default: "" },
    skills: { type: [String], default: [] },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
  },
  { timestamps: true }
);

export type ProfileDoc = InferSchemaType<typeof profileSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const Profile = mongoose.model("Profile", profileSchema);
