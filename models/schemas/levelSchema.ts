import mongoose from "mongoose";
import * as slugger from 'mongoose-slugger-plugin';
import Level from "../db/level";

const LevelSchema = new mongoose.Schema<Level>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    authorNote: {
      type: String,
    },
    // data format is a string of 'LevelDataType's with rows separated by '\n'
    data: {
      type: String,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    isDraft: {
      type: Boolean,
      required: true,
    },
    leastMoves: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: { 
      type: String,
      slug: 'name'
    },
    points: {
      type: Number,
      required: true,
    },
    psychopathId: {
      type: Number,
    },
    ts: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
  },
  {
    collation: {
      locale: "en_US",
      strength: 2,
    },
  }
);
LevelSchema.index({ slug: 1 }, { name: 'slug_index', unique: true });
LevelSchema.plugin(slugger.plugin, new slugger.SluggerOptions({
  slugPath: 'slug',
  generateFrom: ['name'],
  index: 'slug_index'
}));
export default LevelSchema;
