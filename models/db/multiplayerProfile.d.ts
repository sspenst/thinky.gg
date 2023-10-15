interface MultiplayerProfile {
  calcRushBulletCount: number;
  calcRushBlitzCount: number;
  calcRushRapidCount: number;
  calcRushClassicalCount: number;

  gameId?: string;
  // elo
  ratingRushBullet: number;
  ratingRushBlitz: number;
  ratingRushRapid: number;
  ratingRushClassical: number;

  ratingDeviation: number;
  userId: Types.ObjectId & User;
  volatility: number;
}

// add unique index for userId and type
MultiplayerProfileSchema.index({ userId: 1 }, { unique: true });
export default MultiplayerProfile;
