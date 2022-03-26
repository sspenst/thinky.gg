import React, { useEffect } from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  isLoading: boolean | undefined;
}

export default function ProgressBar({ isLoading }: ProgressBarProps) {
  useEffect(() => {
    if (isLoading === undefined) {
      return;
    }

    const el = document.getElementById('progress');

    if (!el) {
      return;
    }

    if (isLoading) {
      if (el.classList.contains(styles.loading)) {
        return;
      }

      el.classList.remove(styles.loaded);
      el.style.display = 'none';
      el.offsetWidth; /* trigger reflow */
      el.style.display = 'block';
      el.classList.add(styles.loading);
    } else {
      if (el.classList.contains(styles.loaded)) {
        return;
      }

      el.classList.remove(styles.loading);
      el.classList.add(styles.loaded);
    }
  }, [isLoading]);

  return (
    <div
      id={'progress'}
      style={{
        backgroundColor: 'var(--progress-bar-color)',
        display: 'block',
        height: 2,
        left: 0,
        position: 'fixed',
        top: 0,
        transition: 'width 0.4s ease 0s, opacity 1.3s',
        zIndex: 9999,
      }}
    />
  );
}
