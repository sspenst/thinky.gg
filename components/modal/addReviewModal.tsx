import React, { useContext, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';
import Review from '../../models/db/review';

interface RadioButtonProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  score: string | undefined;
  value: string | undefined;
}

function RadioButton({ onChange, score, value }: RadioButtonProps) {
  return (
    <label style={{padding: 10}}>
      <input
        checked={score === value}
        name='score'
        onChange={onChange}
        style={{
          marginRight: 10,
        }}
        type='radio'
        value={value}
      />
      {value === '0' ? '-' : value}
    </label>
  );
}

interface AddReviewModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string;
  userReview: Review | undefined;
}

export default function AddReviewModal({ closeModal, isOpen, levelId, userReview }: AddReviewModalProps) {
  const [score, setScore] = useState<string>(userReview?.score.toString() ?? '0');
  const [text, setText] = useState<string>(userReview?.text ?? '');
  const { windowSize } = useContext(PageContext);
  // magic number to account for modal padding and margin
  const maxTextAreaWidth = windowSize.width - 82;
  const textAreaWidth = maxTextAreaWidth < 500 ? maxTextAreaWidth : 500;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log(e.target.value, e.currentTarget.value);
    setScore(e.target.value);
  }

  function onSubmit() {
    fetch(`/api/review/${levelId}`, {
      method: userReview ? 'PUT': 'POST',
      body: JSON.stringify({
        score: score,
        text: text,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 200) {
        closeModal();
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error adding review');
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={`${userReview ? 'Edit' : 'Add'} Review`}
    >
      <>
        <div style={{textAlign: 'center'}}>
          <RadioButton onChange={onChange} score={score} value={'0'} />
          <RadioButton onChange={onChange} score={score} value={'1'} />
          <RadioButton onChange={onChange} score={score} value={'2'} />
          <RadioButton onChange={onChange} score={score} value={'3'} />
          <RadioButton onChange={onChange} score={score} value={'4'} />
          <RadioButton onChange={onChange} score={score} value={'5'} />
        </div>
        <div style={{padding: '8px 0 0 0'}}>
          <textarea
            onChange={e => setText(e.target.value)}
            placeholder={`${userReview ? 'Edit' : 'Add'} review...`}
            required
            rows={4}
            style={{
              color: 'rgb(0, 0, 0)',
              resize: 'none',
              width: textAreaWidth,
            }}
            value={text}
          />
        </div>
      </>
    </Modal>
  );
}
