enum AdminCommand {
  // user
  RefreshAchievements = 'refreshAchievements',
  DeleteAchievements = 'deleteAchievements',
  DeleteUser = 'deleteUser',

  // level
  RefreshIndexCalcs = 'refreshIndexCalcs',
  RefreshPlayAttempts = 'calcPlayAttempts',
  SwitchIsRanked = 'switchIsRanked',
  RegenImage = 'regenImage',

  // admin
  SendAdminMessage = 'sendAdminMessage',
  RunEmailDigest = 'runEmailDigest',
  SendReloadPageToUsers = 'sendReloadPageToUsers',
  RunBatchRefreshPlayAttempts = 'runBatchRefreshPlayAttempts',
}

export default AdminCommand;
