Original prompt: When users try to swipe to move, sometimes the tap on a square to move to gets called instead which is extremely frustrating for mobile users. let's make it so that you have to press and hold on a square to move to it, like you have to hold 0.6 seconds

## 2026-03-04
- Investigated touch and click flow in `hooks/useTouchControls.ts`, `components/level/grid.tsx`, and `components/level/game.tsx`.
- Identified that mobile tap-to-destination moves are triggered via grid/tile click path, while swipe suppression relies on `isSwiping`.
- Planned fix: add explicit touch hold gating (600ms) signal in touch controls and require it for mobile tap-to-destination moves.
- Implemented touch hold gating in `useTouchControls` via `consumeTapToMoveIntent()` and wired it into `Game` so mobile destination moves only execute after a 600ms hold.
