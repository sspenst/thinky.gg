import Direction from '@root/constants/direction';
import TileType from '../constants/tileType';

interface TileTypeProps {
  directions?: Direction[];
  /**
   * TileType if the tile is moved off or on an exit, depending on isOnExit
   */
  exitSiblingTileType?: TileType;
  isOnExit?: boolean;
}

export default class TileTypeHelper {
  static tileTypePropsDict: { [tileType: string]: TileTypeProps } = {
    [TileType.Default]: {},
    [TileType.Wall]: {},
    [TileType.Block]: {
      directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT, Direction.UP],
      exitSiblingTileType: TileType.BlockOnExit,
    },
    [TileType.Exit]: {},
    [TileType.Player]: {},
    [TileType.Hole]: {},
    [TileType.Left]: {
      directions: [Direction.LEFT],
      exitSiblingTileType: TileType.LeftOnExit,
    },
    [TileType.Up]: {
      directions: [Direction.UP],
      exitSiblingTileType: TileType.UpOnExit,
    },
    [TileType.Right]: {
      directions: [Direction.RIGHT],
      exitSiblingTileType: TileType.RightOnExit,
    },
    [TileType.Down]: {
      directions: [Direction.DOWN],
      exitSiblingTileType: TileType.DownOnExit,
    },
    [TileType.UpLeft]: {
      directions: [Direction.UP, Direction.LEFT],
      exitSiblingTileType: TileType.UpLeftOnExit,
    },
    [TileType.UpRight]: {
      directions: [Direction.UP, Direction.RIGHT],
      exitSiblingTileType: TileType.UpRightOnExit,
    },
    [TileType.DownRight]: {
      directions: [Direction.DOWN, Direction.RIGHT],
      exitSiblingTileType: TileType.DownRightOnExit,
    },
    [TileType.DownLeft]: {
      directions: [Direction.DOWN, Direction.LEFT],
      exitSiblingTileType: TileType.DownLeftOnExit,
    },
    [TileType.NotLeft]: {
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
      exitSiblingTileType: TileType.NotLeftOnExit,
    },
    [TileType.NotUp]: {
      directions: [Direction.LEFT, Direction.RIGHT, Direction.DOWN],
      exitSiblingTileType: TileType.NotUpOnExit,
    },
    [TileType.NotRight]: {
      directions: [Direction.UP, Direction.LEFT, Direction.DOWN],
      exitSiblingTileType: TileType.NotRightOnExit,
    },
    [TileType.NotDown]: {
      directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
      exitSiblingTileType: TileType.NotDownOnExit,
    },
    [TileType.LeftRight]: {
      directions: [Direction.LEFT, Direction.RIGHT],
      exitSiblingTileType: TileType.LeftRightOnExit,
    },
    [TileType.UpDown]: {
      directions: [Direction.UP, Direction.DOWN],
      exitSiblingTileType: TileType.UpDownOnExit,
    },
    [TileType.BlockOnExit]: {
      directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT, Direction.UP],
      exitSiblingTileType: TileType.Block,
      isOnExit: true,
    },
    [TileType.LeftOnExit]: {
      directions: [Direction.LEFT],
      exitSiblingTileType: TileType.Left,
      isOnExit: true,
    },
    [TileType.UpOnExit]: {
      directions: [Direction.UP],
      exitSiblingTileType: TileType.Up,
      isOnExit: true,
    },
    [TileType.RightOnExit]: {
      directions: [Direction.RIGHT],
      exitSiblingTileType: TileType.Right,
      isOnExit: true,
    },
    [TileType.DownOnExit]: {
      directions: [Direction.DOWN],
      exitSiblingTileType: TileType.Down,
      isOnExit: true,
    },
    [TileType.UpLeftOnExit]: {
      directions: [Direction.UP, Direction.LEFT],
      exitSiblingTileType: TileType.UpLeft,
      isOnExit: true,
    },
    [TileType.UpRightOnExit]: {
      directions: [Direction.UP, Direction.RIGHT],
      exitSiblingTileType: TileType.UpRight,
      isOnExit: true,
    },
    [TileType.DownRightOnExit]: {
      directions: [Direction.DOWN, Direction.RIGHT],
      exitSiblingTileType: TileType.DownRight,
      isOnExit: true,
    },
    [TileType.DownLeftOnExit]: {
      directions: [Direction.DOWN, Direction.LEFT],
      exitSiblingTileType: TileType.DownLeft,
      isOnExit: true,
    },
    [TileType.NotLeftOnExit]: {
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
      exitSiblingTileType: TileType.NotLeft,
      isOnExit: true,
    },
    [TileType.NotUpOnExit]: {
      directions: [Direction.LEFT, Direction.RIGHT, Direction.DOWN],
      exitSiblingTileType: TileType.NotUp,
      isOnExit: true,
    },
    [TileType.NotRightOnExit]: {
      directions: [Direction.UP, Direction.LEFT, Direction.DOWN],
      exitSiblingTileType: TileType.NotRight,
      isOnExit: true,
    },
    [TileType.NotDownOnExit]: {
      directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
      exitSiblingTileType: TileType.NotDown,
      isOnExit: true,
    },
    [TileType.LeftRightOnExit]: {
      directions: [Direction.LEFT, Direction.RIGHT],
      exitSiblingTileType: TileType.LeftRight,
      isOnExit: true,
    },
    [TileType.UpDownOnExit]: {
      directions: [Direction.UP, Direction.DOWN],
      exitSiblingTileType: TileType.UpDown,
      isOnExit: true,
    },
  };

  static canMove(tileType: TileType) {
    const directions = this.tileTypePropsDict[tileType].directions;

    return directions && directions.length > 0;
  }

  static canMoveRestricted(tileType: TileType) {
    const directions = this.tileTypePropsDict[tileType].directions;

    if (!directions) {
      return false;
    }

    return directions.length !== Object.keys(Direction).length;
  }

  static canMoveLeft(tileType: TileType) {
    return this.canMoveInDirection(tileType, Direction.LEFT);
  }

  static canMoveUp(tileType: TileType) {
    return this.canMoveInDirection(tileType, Direction.UP);
  }

  static canMoveRight(tileType: TileType) {
    return this.canMoveInDirection(tileType, Direction.RIGHT);
  }

  static canMoveDown(tileType: TileType) {
    return this.canMoveInDirection(tileType, Direction.DOWN);
  }

  static canMoveInDirection(tileType: TileType, direction: Direction) {
    const directions = this.tileTypePropsDict[tileType].directions;

    if (!directions) {
      return false;
    }

    return directions.includes(direction);
  }

  static isOnExit(tileType: TileType) {
    return !!this.tileTypePropsDict[tileType].isOnExit;
  }

  static getExitSibilingTileType(tileType: TileType) {
    return this.tileTypePropsDict[tileType].exitSiblingTileType;
  }

  // used for the classic theme to know if a block type should have height
  static isRaised(tileType: TileType) {
    return tileType === TileType.Wall ||
      tileType === TileType.Player ||
      this.canMove(tileType);
  }

  // returns undefined if the string is valid, otherwise returns the invalid character
  static getInvalidTileType(data: string) {
    for (let i = 0; i < data.length; i++) {
      if (!Object.values<string>(TileType).includes(data[i])) {
        return data[i];
      }
    }
  }
}
