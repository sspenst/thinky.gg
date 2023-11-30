export function getHashMultiplerLevelRotation(matchId: string, levelId: string, modBy: number = 8) {
  // hash by using the match.matchId and the level._id. convert those to numbers. matchId is a alphanumeric youtube id like v7EHO5sDV3H and level._id is an 24 character hex string like 5f9b1b1b1b1b1b1b1b1b1b1b
  levelId = levelId.substring(0, 8); // only use the first 8 characters of the levelId this is the timestamp
  matchId = matchId.substring(0, 8); // only use the first 8 characters of the matchId so we don't go over the max safe integer
  const matchIdNumber = parseInt(matchId, 36); // this should work because matchId is alphanumeric and there are 36 alphanumeric characters...
  const levelIdNumber = parseInt(levelId, 16); // this should work because levelId is hex and there are 16 hex characters...

  // hash should be modded by 8
  return (matchIdNumber + levelIdNumber) % modBy;
}
