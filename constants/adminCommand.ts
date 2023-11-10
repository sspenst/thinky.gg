enum AdminCommand {
  // user
  RefreshAchievements = 'refreshAchievements',
  DeleteAchievements = 'deleteAchievements',

  // level
  RefreshIndexCalcs = 'refreshIndexCalcs',
  RefreshPlayAttempts = 'calcPlayAttempts',
  SwitchIsRanked = 'switchIsRanked',

  // admin
  SendAdminMessage = 'sendAdminMessage',
}

export default AdminCommand;
