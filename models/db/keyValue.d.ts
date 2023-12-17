import { GameId } from '@root/constants/GameId';
import { Schema } from 'mongoose';

interface KeyValue {
  gameId: GameId;
  key: string;
  value: Schema.Types.Mixed;
}

export default KeyValue;
