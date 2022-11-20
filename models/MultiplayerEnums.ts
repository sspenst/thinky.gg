export enum MultiplayerMatchType {
    ClassicRush = 'ClassicRush',
    // BlitzRush = 'BlitzRush', // TODO
    // BulletRush = 'BulletRush', // TODO
  }
export enum MultiplayerMatchState {
    OPEN = 'OPEN',
    ACTIVE = 'ACTIVE',
    ABORTED = 'ABORTED',
    FINISHED = 'FINISHED',
  }

export interface MatchLog {
    createdAt: Date;
    type: string;
    data: any;
  }
export enum MatchAction {
    CREATE = 'CREATE',
    JOIN = 'join',
    QUIT = 'quit',
    COMPLETE_LEVEL = 'completeLevel',
    GAME_START = 'gameStart',
    GAME_END = 'gameEnd',
  }
