import User from '../data/pathology/user';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema<User>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  moves: {
    type: String,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // password: {
  //   type: String,
  //   required: true,
  // },
});

UserSchema.methods.getMoves = function() {
  return !this.moves ? {} : JSON.parse(this.moves);
}

const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);

export default UserModel;
