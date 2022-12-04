interface MultiplayerProfile {
    calc_matches_count: number;
    userId: Types.ObjectId & User;
    // elo
    rating: number;
    ratingDeviation: number;
    volatility: number;
}

export default MultiplayerProfile;
