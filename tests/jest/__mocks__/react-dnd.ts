// Mock for react-dnd
// In tests, we don't need actual drag-and-drop functionality

export const useDrag = jest.fn(() => [
  { isDragging: false },
  jest.fn(),
  jest.fn(),
]);

export const useDrop = jest.fn(() => [
  { isOver: false, canDrop: false },
  jest.fn(),
]);

export const DndProvider = ({ children }: { children: React.ReactNode }) => children;

export const DragPreviewImage = () => null;
