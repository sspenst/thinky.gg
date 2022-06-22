import { LevelModel } from '../mongoose';
import Stat from '../db/stat';
import mongoose from 'mongoose';
import { refreshIndexCalcs } from './levelSchema';

const StatSchema = new mongoose.Schema<Stat>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  attempts: {
    type: Number,
    required: true,
  },
  complete: {
    type: Boolean,
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

StatSchema.post('save', async function() {
  const level = await LevelModel.findById(this.levelId);

  if (level) {
    await refreshIndexCalcs(level);
  }
});
StatSchema.post('deleteOne', async function(val, next) {

  if (val.deletedCount > 0) {
    const deletedLevelId = this.getQuery()?.levelId.toString();

    const level = await LevelModel.findById(deletedLevelId);

    if (level) {
      await refreshIndexCalcs(level);
    }
  }

  next();
});
StatSchema.post('updateOne', async function(val) {

  if (val.modifiedCount > 0) {
    const updatedDoc = await this.model.findOne(this.getQuery());

    const level = await LevelModel.findById(updatedDoc.levelId);

    if (level) {
      await refreshIndexCalcs(level);
    }
  }
});
export default StatSchema;
