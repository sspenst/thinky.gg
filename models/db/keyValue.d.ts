import { Schema } from 'mongoose';

interface KeyValue {
  key: string;
  value: Schema.Types.Mixed;
  gameId?: string;
}

export default KeyValue;
