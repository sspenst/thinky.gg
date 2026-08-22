import type { Types } from 'mongoose';

/**
 * Creates a Mongo-shaped id for client-only objects without bundling Mongoose.
 * These ids are never persisted, so they only need to be unique for the session.
 */
export default function createTemporaryObjectId(): Types.ObjectId {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${timestamp}${random}` as unknown as Types.ObjectId;
}
