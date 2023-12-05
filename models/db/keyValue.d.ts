import { Schema } from 'mongoose';

interface KeyValue {
  gameId?: string;
  key: string;
  value: Schema.Types.Mixed;
}

export default KeyValue;
