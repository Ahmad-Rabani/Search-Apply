import mongoose, { Schema, type InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["agent", "match", "tailor", "apply", "system"],
      default: "system",
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    href: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const Notification = mongoose.model("Notification", notificationSchema);
