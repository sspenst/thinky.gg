import mongoose from 'mongoose';
import GraphType from '../../constants/graphType';
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
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: true,
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Collection', 'Level'],
  },
  type: {
    type: String,
    required: true,
    enum: GraphType,
  },
  metadata: {
    type: Object,
    default: {},
  },
},
{
  timestamps: true,
});

GraphSchema.index({ follower: 1 });
GraphSchema.index({ following: 1 });
GraphSchema.index({ target: 1 });
GraphSchema.index({ source: 1, target: 1, type: 1 }, {
  unique: true,
  partialFilterExpression: {
    type: { $in: ['FOLLOW', 'BLOCK'] }
  }
});

export default GraphSchema;
