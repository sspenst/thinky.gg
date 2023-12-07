enum TileType {
  Default = '0',
  Wall = '1',
  Block = '2',
  End = '3',
  Start = '4',
  Hole = '5',
  Left = '6',
  Up = '7',
  Right = '8',
  Down = '9',
  UpLeft = 'A',
  UpRight = 'B',
  DownRight = 'C',
  DownLeft = 'D',
  NotLeft = 'E',
  NotUp = 'F',
  NotRight = 'G',
  NotDown = 'H',
  LeftRight = 'I',
  UpDown = 'J',
  BlockOnExit = 'K',
}

export default TileType;

// special variable for marking visited tiles in checkpoint images
export const TileTypeDefaultVisited = 'X';
