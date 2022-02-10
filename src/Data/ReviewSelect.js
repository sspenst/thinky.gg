import { useCallback, useEffect } from 'react';

export default function ReviewSelect(props) {
  const goToLevelSelect = props.goToLevelSelect;

  const handleKeyDown = useCallback(event => {
    const { keyCode } = event;

    // return to pack select with esc
    if (keyCode === 27) {
      goToLevelSelect();
    }
  }, [goToLevelSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const buttons = [];

  for (let i = 0; i < props.reviews.length; i++) {
    const review = props.reviews[i];

    buttons.push(
      <div
        key={i} className={`border-2`}
        style={{
          height: '100px',
          verticalAlign: 'top',
        }}>
        {review.name}
        <br/>
        {review.text}
        <br/>
        {review.psychopathId}
      </div>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
