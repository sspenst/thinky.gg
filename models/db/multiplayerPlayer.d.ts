interface MultiplayerProfile {
    userId: Types.ObjectId & User;
    // glicko2
    rating: number;
    ratingDeviation: number;
    volatility: number;
}

export default MultiplayerProfile;
