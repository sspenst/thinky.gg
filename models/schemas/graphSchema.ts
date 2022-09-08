import mongoose from 'mongoose';
import Graph from '../db/graph';

const GraphSchema = new mongoose.Schema<Graph>({
  source: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel',
    required: true,
  },
  sourceModel: {
    type: String,
    required: true,
    enum: ['User', 'Collection'],
  },
  type: {
    type: String,
    required: true,
    enum: ['follow', 'super_follow', 'block' ],
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: true,
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Collection'],
  },
},
{
  timestamps: true,
});

// add indices
GraphSchema.index({ follower: 1 });
GraphSchema.index({ following: 1 });
GraphSchema.index({ target: 1 });

export default GraphSchema;
