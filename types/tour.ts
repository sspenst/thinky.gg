export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
  target: string | HTMLElement;
  content: React.ReactNode;
  placement?: TourPlacement;
}

export interface TourCallbackData {
  type: 'start' | 'step:before' | 'step:after' | 'tour:end' | 'skipped';
  index: number;
  step?: TourStep;
}

