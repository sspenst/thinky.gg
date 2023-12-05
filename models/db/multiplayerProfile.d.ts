interface MultiplayerProfile {
  _id: Types.ObjectId;
  calcRushBulletCount: number;
  calcRushBlitzCount: number;
  calcRushRapidCount: number;
  calcRushClassicalCount: number;
  gameId?: string;
  ratingDeviation: number;
  ratingRushBullet: number;
  ratingRushBlitz: number;
  ratingRushRapid: number;
  ratingRushClassical: number;
  userId: Types.ObjectId & User;
  volatility: number;
}

// add unique index for userId and type
MultiplayerProfileSchema.index({ userId: 1 }, { unique: true });
export default MultiplayerProfile;
