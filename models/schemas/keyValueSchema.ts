import { GameId } from '@root/constants/GameId';
import mongoose, { Schema } from 'mongoose';
import KeyValue from '../db/keyValue';

const KeyValueSchema = new mongoose.Schema<KeyValue>(
  {
    key: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    gameId: {
      type: String,
      enum: GameId,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// add index on key
KeyValueSchema.index({ key: 1 });
// add index on value (why not... could be helpful for debugging?)
KeyValueSchema.index({ value: 1 });

export default KeyValueSchema;
