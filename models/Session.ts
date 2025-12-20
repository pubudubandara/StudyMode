import mongoose, { Schema, Model } from 'mongoose';

export interface ISession {
  _id: string;
  userId: mongoose.Types.ObjectId;
  sessionId: number;
  duration: number; // in seconds
  target: number; // in seconds
  date: Date;
  timestamp: number;
  createdAt: Date;
  updatedAt: Date;
}

type SessionModel = Model<ISession>;

const sessionSchema = new Schema<ISession, SessionModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    target: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
sessionSchema.index({ userId: 1, timestamp: -1 });

export default (mongoose.models.Session as SessionModel) || mongoose.model<ISession, SessionModel>('Session', sessionSchema);
