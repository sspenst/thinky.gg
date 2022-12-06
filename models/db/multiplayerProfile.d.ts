interface MultiplayerProfile {
    calc_matches_count: number;
    // elo
    rating: number;
    ratingDeviation: number;
    userId: Types.ObjectId & User;
    volatility: number;
}

export default MultiplayerProfile;
