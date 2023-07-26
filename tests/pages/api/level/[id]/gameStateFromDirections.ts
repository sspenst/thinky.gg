import { GameState } from '@root/helpers/gameStateHelpers';

const gameStateFromDirections = {
  'actionCount': 6,
  'blocks': [
    {
      'id': 0,
      'pos': {
        'x': 5,
        'y': 0
      },
      'type': 'B',
      'inHole': false
    },
    {
      'id': 1,
      'pos': {
        'x': 1,
        'y': 2
      },
      'type': '2',
      'inHole': true
    },
    {
      'id': 2,
      'pos': {
        'x': 0,
        'y': 3
      },
      'type': '6',
      'inHole': false
    },
    {
      'id': 3,
      'pos': {
        'x': 1,
        'y': 3
      },
      'type': '7',
      'inHole': false
    },
    {
      'id': 4,
      'pos': {
        'x': 2,
        'y': 3
      },
      'type': '8',
      'inHole': false
    },
    {
      'id': 5,
      'pos': {
        'x': 3,
        'y': 3
      },
      'type': '9',
      'inHole': false
    },
    {
      'id': 6,
      'pos': {
        'x': 0,
        'y': 4
      },
      'type': 'A',
      'inHole': false
    },
    {
      'id': 7,
      'pos': {
        'x': 1,
        'y': 4
      },
      'type': 'B',
      'inHole': false
    },
    {
      'id': 8,
      'pos': {
        'x': 2,
        'y': 4
      },
      'type': 'C',
      'inHole': false
    },
    {
      'id': 9,
      'pos': {
        'x': 3,
        'y': 4
      },
      'type': 'D',
      'inHole': false
    }
  ],
  'board': [
    [
      {
        'tileType': '0',
        'text': [
          0
        ]
      },
      {
        'tileType': '0',
        'text': [
          1
        ]
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': [
          5
        ]
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      }
    ],
    [
      {
        'tileType': '1',
        'text': []
      },
      {
        'tileType': '0',
        'text': [
          2
        ]
      },
      {
        'tileType': '0',
        'text': [
          3
        ]
      },
      {
        'tileType': '0',
        'text': [
          4
        ]
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      }
    ],
    [
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      }
    ],
    [
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      }
    ],
    [
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      },
      {
        'tileType': '3',
        'text': []
      },
      {
        'tileType': '0',
        'text': []
      }
    ]
  ],
  'height': 5,
  'moveCount': 6,
  'moves': [
    {
      'direction': 3,
      'pos': {
        'x': 0,
        'y': 0
      }
    },
    {
      'direction': 4,
      'pos': {
        'x': 1,
        'y': 0
      },
      'blockId': 1
    },
    {
      'direction': 3,
      'pos': {
        'x': 1,
        'y': 1
      }
    },
    {
      'direction': 3,
      'pos': {
        'x': 2,
        'y': 1
      }
    },
    {
      'direction': 2,
      'pos': {
        'x': 3,
        'y': 1
      }
    },
    {
      'direction': 3,
      'pos': {
        'x': 3,
        'y': 0
      },
      'blockId': 0
    }
  ],
  'pos': {
    'x': 4,
    'y': 0
  },
  'width': 6
} as GameState;

export default gameStateFromDirections;
