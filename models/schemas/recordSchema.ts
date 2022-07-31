import { LevelModel } from '../mongoose';
import Record from '../db/record';
import mongoose from 'mongoose';
import { refreshIndexCalcs } from './levelSchema';

const RecordSchema = new mongoose.Schema<Record>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
  },
  moves: {
    type: Number,
    required: true,
  },
  ts: {
    type: Number,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export default RecordSchema;
// add index for levelId
RecordSchema.index({ levelId: 1 });

// On save, call refreshIndexCalcs on the level with levelId
RecordSchema.post('save', async function() {
  const level = await LevelModel.findById(this.levelId);

  if (level) {
    await refreshIndexCalcs(level);
  }

});

// On save, call refreshIndexCalcs on the level with levelId
RecordSchema.post('updateOne', async function() {
  const level = await LevelModel.findById(this.levelId);

  if (level) {
    await refreshIndexCalcs(level);
  }

});
