import { CheckpointState } from '@root/helpers/checkpointHelpers';

const CHECKPOINT_STATE_2 = {
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
        'levelDataType': '0',
        'text': [
          0
        ]
      },
      {
        'levelDataType': '0',
        'text': [
          1
        ]
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': [
          5
        ]
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      }
    ],
    [
      {
        'levelDataType': '1',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': [
          2
        ]
      },
      {
        'levelDataType': '0',
        'text': [
          3
        ]
      },
      {
        'levelDataType': '0',
        'text': [
          4
        ]
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      }
    ],
    [
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      }
    ],
    [
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      }
    ],
    [
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      },
      {
        'levelDataType': '3',
        'text': []
      },
      {
        'levelDataType': '0',
        'text': []
      }
    ]
  ],
  'height': 5,
  'moveCount': 6,
  'moves': [
    {
      'code': 'ArrowRight',
      'pos': {
        'x': 0,
        'y': 0
      }
    },
    {
      'code': 'ArrowDown',
      'pos': {
        'x': 1,
        'y': 0
      },
      'block': {
        'id': 1,
        'pos': {
          'x': 1,
          'y': 1
        },
        'type': '2',
        'inHole': false
      },
      'holePos': {
        'x': 1,
        'y': 2
      }
    },
    {
      'code': 'ArrowRight',
      'pos': {
        'x': 1,
        'y': 1
      }
    },
    {
      'code': 'ArrowRight',
      'pos': {
        'x': 2,
        'y': 1
      }
    },
    {
      'code': 'ArrowUp',
      'pos': {
        'x': 3,
        'y': 1
      }
    },
    {
      'code': 'ArrowRight',
      'pos': {
        'x': 3,
        'y': 0
      },
      'block': {
        'id': 0,
        'pos': {
          'x': 4,
          'y': 0
        },
        'type': 'B',
        'inHole': false
      }
    }
  ],
  'pos': {
    'x': 4,
    'y': 0
  },
  'width': 6
} as CheckpointState;

export default CHECKPOINT_STATE_2;
