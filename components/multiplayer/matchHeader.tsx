import classNames from 'classnames';

interface MatchHeaderProps {
  matchInProgress: boolean;
  prettyMatchState: string;
}

export default function MatchHeader({ matchInProgress, prettyMatchState }: MatchHeaderProps) {
  return (
    <div className={classNames('text-center mb-8 animate-fadeInDown', { 'hidden': matchInProgress })}>
      <h1 className='font-bold text-3xl sm:text-4xl lg:text-5xl mb-4'>
        <span className='bg-linear-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent'>
          {prettyMatchState}
        </span>
      </h1>
    </div>
  );
}
