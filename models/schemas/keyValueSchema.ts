import { GameId } from '@root/constants/GameId';
import mongoose, { Schema } from 'mongoose';
import KeyValue from '../db/keyValue';

const KeyValueSchema = new mongoose.Schema<KeyValue>(
  {
    gameId: {
      type: String,
      enum: GameId,
      required: true,
    },
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
  },
  {
    timestamps: true,
  }
);

KeyValueSchema.index({ key: 1 });
KeyValueSchema.index({ value: 1 });

export default KeyValueSchema;
