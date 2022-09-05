import { Schema } from 'mongoose';

interface KeyValue {
  key: string;
  value: Schema.Types.Mixed;
}

export default KeyValue;
