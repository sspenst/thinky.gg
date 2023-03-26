import React from 'react';
import { GameState } from '../game';

export const CheckpointBanner = ({ checkpoints }: { checkpoints: GameState[] }) => {
  const [showTip, setShowTip] = React.useState(false);
  const checkpointVisual = [] as JSX.Element[];

  checkpointVisual.push(<div key='checkpoint-visual-header' className='flex flex-col text-xs' >
    <span className='p-1 border'>Key</span>
    <span className='p-1 '>Moves</span>
  </div>);

  for (let i = 0; i < 10; i++) {
    checkpointVisual.push(
      <div key={'checkpoint-visual-' + i} className='flex flex-col text-xs' >
        <span className='p-1 border'>{i}</span><span className=' p-1'>{checkpoints[i] ? checkpoints[i].moveCount : '-'}</span>

      </div>
    );
  }

  return (
    <div className='flex flex-col'>
      <div className='flex flex-row items-center p-2 gap-2'
        style={{
          cursor: 'pointer',
        }}
        onClick={() => {
          setShowTip(!showTip);
        }}>
        <div className=''>
          <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='currentColor' className='bi bi-list-ol' viewBox='0 0 16 16' >
            <path fillRule='evenodd' d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z' />
            <path d='M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z' />
          </svg></div>

      </div>
      { showTip &&
      <div className='flex flex-col rounded-lg p-2'
        style={{
          backgroundColor: 'var(--bg-color-2)',
        }}>
        <span className='text-xs'>Press SHIFT+[0-9] to save a checkpoint.<br />Press the number to go back to that state.</span>
        <div className='flex flex-row'>
          {checkpointVisual}
        </div>
      </div>}

    </div>
  );
};