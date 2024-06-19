import mongoose from 'mongoose';
import { Report } from '../db/report';

const ReportSchema = new mongoose.Schema<Report>({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  reportedEntityModel: {
    type: String,
    required: true,
  },
  reasonType: {
    type: String,
    required: true,
  },

  message: {
    type: String,
    required: false,
    default: '',
  },
});

ReportSchema.index({ reporter: 1, reportedUser: 1, reportedEntity: 1 }, { unique: true });

export default ReportSchema;
