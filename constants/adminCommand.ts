enum AdminCommand {
  // user
  RefreshAchievements = 'refreshAchievements',
  DeleteAchievements = 'deleteAchievements',
  DeleteUser = 'deleteUser',
  ArchiveAllLevels = 'archiveAllLevels',

  // level
  RefreshIndexCalcs = 'refreshIndexCalcs',
  RefreshPlayAttempts = 'calcPlayAttempts',
  SwitchIsRanked = 'switchIsRanked',
  RegenImage = 'regenImage',

  // reports
  CloseReport = 'closeReport',

  // admin
  SendAdminMessage = 'sendAdminMessage',
  RunEmailDigest = 'runEmailDigest',
  SendReloadPageToUsers = 'sendReloadPageToUsers',
  RunBatchRefreshPlayAttempts = 'runBatchRefreshPlayAttempts',
}

export default AdminCommand;
