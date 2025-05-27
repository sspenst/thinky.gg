import { Schema } from 'mongoose';

interface Cache {
  key: string;
  value: Schema.Types.Mixed;
  createdAt: Date;
  expireAt: Date; // When the document should expire
}

export default Cache;
