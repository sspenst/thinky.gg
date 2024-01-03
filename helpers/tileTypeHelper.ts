import Direction from '@root/constants/direction';
import TileType from '../constants/tileType';

export default class TileTypeHelper {
  static canMove(tileType: TileType) {
    return tileType === TileType.Block ||
      tileType === TileType.BlockOnEnd ||
      this.canMoveRestricted(tileType);
  }

  static canMoveRestricted(tileType: TileType) {
    return tileType === TileType.Left ||
      tileType === TileType.Up ||
      tileType === TileType.Right ||
      tileType === TileType.Down ||
      tileType === TileType.UpLeft ||
      tileType === TileType.UpRight ||
      tileType === TileType.DownRight ||
      tileType === TileType.DownLeft ||
      tileType === TileType.NotLeft ||
      tileType === TileType.NotUp ||
      tileType === TileType.NotRight ||
      tileType === TileType.NotDown ||
      tileType === TileType.LeftRight ||
      tileType === TileType.UpDown;
  }

  static canMoveLeft(tileType: TileType) {
    return tileType === TileType.Block ||
      tileType === TileType.BlockOnEnd ||
      tileType === TileType.Left ||
      tileType === TileType.UpLeft ||
      tileType === TileType.DownLeft ||
      tileType === TileType.NotUp ||
      tileType === TileType.NotRight ||
      tileType === TileType.NotDown ||
      tileType === TileType.LeftRight;
  }

  static canMoveUp(tileType: TileType) {
    return tileType === TileType.Block ||
      tileType === TileType.BlockOnEnd ||
      tileType === TileType.Up ||
      tileType === TileType.UpLeft ||
      tileType === TileType.UpRight ||
      tileType === TileType.NotLeft ||
      tileType === TileType.NotRight ||
      tileType === TileType.NotDown ||
      tileType === TileType.UpDown;
  }

  static canMoveRight(tileType: TileType) {
    return tileType === TileType.Block ||
      tileType === TileType.BlockOnEnd ||
      tileType === TileType.Right ||
      tileType === TileType.UpRight ||
      tileType === TileType.DownRight ||
      tileType === TileType.NotLeft ||
      tileType === TileType.NotUp ||
      tileType === TileType.NotDown ||
      tileType === TileType.LeftRight;
  }

  static canMoveDown(tileType: TileType) {
    return tileType === TileType.Block ||
      tileType === TileType.BlockOnEnd ||
      tileType === TileType.Down ||
      tileType === TileType.DownLeft ||
      tileType === TileType.DownRight ||
      tileType === TileType.NotLeft ||
      tileType === TileType.NotUp ||
      tileType === TileType.NotRight ||
      tileType === TileType.UpDown;
  }

  static canMoveInDirection(tileType: TileType, direction: Direction) {
    switch (direction) {
    case Direction.LEFT:
      return this.canMoveLeft(tileType);
    case Direction.UP:
      return this.canMoveUp(tileType);
    case Direction.RIGHT:
      return this.canMoveRight(tileType);
    case Direction.DOWN:
      return this.canMoveDown(tileType);
    }
  }

  // used for the classic theme to know if a block type should have height
  static isRaised(tileType: TileType) {
    return tileType === TileType.Wall ||
      tileType === TileType.Start ||
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
