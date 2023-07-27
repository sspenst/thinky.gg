import { GameState } from '@root/helpers/gameStateHelpers';

const gameStateFromDirections = {
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
        'text': [],
        'block': {
          'id': 0,
          'tileType': 'B'
        }
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
        'text': [],
        'blockInHole': {
          'id': 1,
          'tileType': '2'
        }
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
        'text': [],
        'block': {
          'id': 2,
          'tileType': '6'
        }
      },
      {
        'tileType': '0',
        'text': [],
        'block': {
          'id': 3,
          'tileType': '7'
        }
      },
      {
        'tileType': '0',
        'text': [],
        'block': {
          'id': 4,
          'tileType': '8'
        }
      },
      {
        'tileType': '0',
        'text': [],
        'block': {
          'id': 5,
          'tileType': '9'
        }
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
        'text': [],
        'block': {
          'id': 6,
          'tileType': 'A'
        }
      },
      {
        'tileType': '0',
        'text': [],
        'block': {
          'id': 7,
          'tileType': 'B'
        }
      },
      {
        'tileType': '0',
        'text': [],
        'block': {
          'id': 8,
          'tileType': 'C'
        }
      },
      {
        'tileType': '0',
        'text': [],
        'block': {
          'id': 9,
          'tileType': 'D'
        }
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
  'moves': [
    {
      'direction': 3
    },
    {
      'direction': 4,
      'blockId': 1
    },
    {
      'direction': 3
    },
    {
      'direction': 3
    },
    {
      'direction': 2
    },
    {
      'direction': 3,
      'blockId': 0
    }
  ],
  'pos': {
    'x': 4,
    'y': 0
  }
} as GameState;

export default gameStateFromDirections;
