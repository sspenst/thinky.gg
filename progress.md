Original prompt: When users try to swipe to move, sometimes the tap on a square to move to gets called instead which is extremely frustrating for mobile users. let's make it so that you have to press and hold on a square to move to it, like you have to hold 0.6 seconds

## 2026-03-04
- Investigated touch and click flow in `hooks/useTouchControls.ts`, `components/level/grid.tsx`, and `components/level/game.tsx`.
- Identified that mobile tap-to-destination moves are triggered via grid/tile click path, while swipe suppression relies on `isSwiping`.
- Planned fix: gate mobile tap-to-destination moves in the touch controls layer so swipe gestures cannot accidentally trigger the click path.
- Iterated from a hold-based gate to a double-tap gate after user feedback.
- Replaced the hold gate with same-spot double-tap gating for mobile destination moves. Swipe and long-press drag suppression still clear the pending tap state so they do not accidentally arm a move.
