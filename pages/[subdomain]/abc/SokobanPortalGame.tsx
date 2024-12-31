import React, { useCallback, useEffect, useState } from 'react';

/** CONFIG: Tile size, board dimensions, etc. */
const TILE_SIZE = 48;
const NUM_ROWS = 9;
const NUM_COLS = 9;

/** Entity Types */
const TYPE_PLAYER = 'player';
const TYPE_CRATE = 'crate';
const TYPE_ICE = 'ice';
const TYPE_ORANGE_PORTAL = 'portal-orange';
const TYPE_BLUE_PORTAL = 'portal-blue';

/** We'll store walls in a 2D array: true = wall, false = empty. */
const initialWalls = [
    [true, true, true, true, true, true, true, true, true],
    [true, false, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, false, true],
    [true, true, true, true, true, true, true, true, true],
];

/**
 * Entities: Each entity is an object:
 *  {
 *    id:   string or number,
 *    type: 'player' | 'crate' | 'ice' | 'portal-orange' | 'portal-blue',
 *    row:  number,
 *    col:  number,
 *  }
 */
const initialEntities = [
    { id: 'player1', type: TYPE_PLAYER, row: 1, col: 1 },
    { id: 'crate1', type: TYPE_CRATE, row: 2, col: 3 },
    { id: 'ice1', type: TYPE_ICE, row: 5, col: 4 },
    // We'll place an orange portal on the board to test:
    { id: 'portalO', type: TYPE_ORANGE_PORTAL, row: 3, col: 3 },
    // Blue portal not placed yet (will be placed by pressing "B")
];

/** Helper to generate unique IDs for newly placed portals. */
let portalCounter = 0;

function SokobanPortalGame() {
    const [walls] = useState(initialWalls);
    const [entities, setEntities] = useState(initialEntities);
    const [nextPortalColor, setNextPortalColor] = useState('orange');

    // A quick reference to the player's entity (assuming only one player).
    const player = entities.find((e) => e.type === TYPE_PLAYER);

    // ========== KEYBOARD INPUT ==========
    const handleKeyDown = useCallback((e) => {
        switch (e.key) {
            case 'ArrowUp':
                movePlayer(-1, 0);
                break;
            case 'ArrowDown':
                movePlayer(1, 0);
                break;
            case 'ArrowLeft':
                movePlayer(0, -1);
                break;
            case 'ArrowRight':
                movePlayer(0, 1);
                break;
            case 'o': // place orange portal
            case 'O':
                placePortal('orange');
                break;
            case 'b': // place blue portal
            case 'B':
                placePortal('blue');
                break;
            default:
                break;
        }
    }, [entities, player]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // ========== MOVEMENT / LOGIC ==========

    /** Move player by (dRow, dCol) if possible. */
    const movePlayer = (dRow, dCol) => {
        if (!player) return;
        const nextRow = player.row + dRow;
        const nextCol = player.col + dCol;

        // Check bounds and walls
        if (!isInBounds(nextRow, nextCol) || walls[nextRow][nextCol]) {
            return;
        }

        // Check entity in front
        const entityInFront = getEntityAt(nextRow, nextCol);

        if (!entityInFront) {
            // No entity => just move player
            updateEntityPos(player.id, nextRow, nextCol);

            return;
        }

        // If it's a portal, teleport the player
        if (isPortal(entityInFront.type)) {
            const teleported = teleportEntity(player, entityInFront, dRow, dCol);

            if (teleported) return;
        }

        // If it's a crate or ice
        if (entityInFront.type === TYPE_CRATE) {
            pushCrate(entityInFront, dRow, dCol);
        } else if (entityInFront.type === TYPE_ICE) {
            pushIce(entityInFront, dRow, dCol);
        }
    };

    /** Push a crate one step or through a portal. */
    const pushCrate = (crateEntity, dRow, dCol) => {
        const nextRow = crateEntity.row + dRow;
        const nextCol = crateEntity.col + dCol;

        if (!isInBounds(nextRow, nextCol) || walls[nextRow][nextCol]) {
            return;
        }

        // Check if something is there
        const blocking = getEntityAt(nextRow, nextCol);

        // If blocked by another crate or ice
        if (blocking && (blocking.type === TYPE_CRATE || blocking.type === TYPE_ICE)) {
            return;
        }

        // If there's a portal in front
        if (blocking && isPortal(blocking.type)) {
            // Teleport crate
            const teleported = teleportEntity(crateEntity, blocking, dRow, dCol);

            if (teleported) {
                // Move player into crate's old position
                updateEntityPos(player.id, crateEntity.row, crateEntity.col);
            }

            return;
        }

        // Otherwise it's empty => push crate
        if (!blocking) {
            updateEntityPos(crateEntity.id, nextRow, nextCol);
            // Player steps into the crate's old spot
            updateEntityPos(player.id, crateEntity.row, crateEntity.col);
        }
    };

    /** Push an ice block. It slides until it hits a wall/crate/ice. */
    const pushIce = (iceEntity, dRow, dCol) => {
        const oldRow = iceEntity.row;
        const oldCol = iceEntity.col;

        // Slide the ice
        slideIceAndTeleport(iceEntity, dRow, dCol);

        // Let the player step into ice's original position
        updateEntityPos(player.id, oldRow, oldCol);
    };

    /**
             * Slide an ice block from current position in (dRow,dCol).
             * If it lands on a portal, teleport it and continue sliding from the new location.
             */
    const slideIceAndTeleport = (iceEntity, dRow, dCol) => {
        const startRow = iceEntity.row;
        const startCol = iceEntity.col;

        // Find where the ice would stop if there were no portals
        const { finalRow, finalCol } = findIceStop(startRow, startCol, dRow, dCol);

        // If no movement possible, we're done
        if (finalRow === startRow && finalCol === startCol) {
            return;
        }

        // Check if final cell is a portal
        const portalEntity = getEntityAt(finalRow, finalCol);

        if (portalEntity && isPortal(portalEntity.type)) {
            // Move ice to portal position first
            updateEntityPos(iceEntity.id, finalRow, finalCol);

            // Find the matching portal
            const matchingType = portalEntity.type === TYPE_ORANGE_PORTAL ? TYPE_BLUE_PORTAL : TYPE_ORANGE_PORTAL;
            const destinationPortal = entities.find(e => e.type === matchingType && e.id !== portalEntity.id);

            if (destinationPortal) {
                // Calculate exit position
                const exitRow = destinationPortal.row + dRow;
                const exitCol = destinationPortal.col + dCol;

                // Check if exit is valid
                if (isInBounds(exitRow, exitCol) && !walls[exitRow][exitCol] && !getEntityAt(exitRow, exitCol)) {
                    // Animate the sequence
                    setTimeout(() => {
                        // Teleport to exit position
                        updateEntityPos(iceEntity.id, exitRow, exitCol);

                        setTimeout(() => {
                            // Find the next stopping point from the exit position
                            const nextStop = findIceStop(exitRow, exitCol, dRow, dCol);

                            // If there's somewhere to move to
                            if (nextStop.finalRow !== exitRow || nextStop.finalCol !== exitCol) {
                                // Check if next stop is another portal
                                const nextPortal = getEntityAt(nextStop.finalRow, nextStop.finalCol);

                                if (nextPortal && isPortal(nextPortal.type)) {
                                    // Recursively handle the next portal teleport
                                    slideIceAndTeleport(iceEntity, dRow, dCol);
                                } else {
                                    // Just move to final position
                                    updateEntityPos(iceEntity.id, nextStop.finalRow, nextStop.finalCol);
                                }
                            }
                        }, 200); // Delay before continuing slide
                    }, 200); // Delay before teleporting
                }
            }

            return;
        }

        // No portal - just move to final position
        updateEntityPos(iceEntity.id, finalRow, finalCol);
    };

    /**
                   * Return where ice stops if it starts at (row,col) moving (dRow,dCol).
                   * We stop if we hit a wall, crate, ice, or go out of bounds.
                   * If we land on a portal, we stop exactly there so we can handle teleport.
                   */
    const findIceStop = (row, col, dRow, dCol) => {
        let r = row;
        let c = col;

        while (true) {
            const nr = r + dRow;
            const nc = c + dCol;

            if (!isInBounds(nr, nc)) break; // out of bounds
            if (walls[nr][nc]) break; // hits wall
            const entity = getEntityAt(nr, nc);

            // hits crate or ice => stop
            if (entity && (entity.type === TYPE_CRATE || entity.type === TYPE_ICE)) {
                break;
            }

            // can move onto it
            r = nr;
            c = nc;

            // If there's a portal, we stop on that cell and handle teleport externally
            if (entity && isPortal(entity.type)) {
                break;
            }
        }

        return { finalRow: r, finalCol: c };
    };

    /**
                   * Teleport an entity (crate or ice) through matching portal.
                   * Then place it on the exit cell (one step beyond the destination portal) if free.
                   * Return true if successful, false otherwise.
                   */
    const teleportEntity = (movingEntity, sourcePortal, dRow, dCol) => {
        const matchingType =
            sourcePortal.type === TYPE_ORANGE_PORTAL
                ? TYPE_BLUE_PORTAL
                : TYPE_ORANGE_PORTAL;

        // Find the other portal
        const destinationPortal = entities.find(
            (e) => e.type === matchingType && e.id !== sourcePortal.id
        );

        if (!destinationPortal) {
            return false; // no matching portal
        }

        // The exit cell is one step in the same direction from the destination portal
        const exitRow = destinationPortal.row + dRow;
        const exitCol = destinationPortal.col + dCol;

        // Check if exit cell is free & in bounds
        if (!isInBounds(exitRow, exitCol)) return false;
        if (walls[exitRow][exitCol]) return false;
        if (getEntityAt(exitRow, exitCol)) return false;

        // Move entity onto exit cell
        updateEntityPos(movingEntity.id, exitRow, exitCol);

        return true;
    };

    // ========== UTILS ==========

    /** Returns whether (row,col) is inside the board. */
    const isInBounds = (r, c) => r >= 0 && r < NUM_ROWS && c >= 0 && c < NUM_COLS;

    /** Returns the entity at (row,col), or undefined. */
    const getEntityAt = (row, col) => {
        return entities.find((e) => e.row === row && e.col === col);
    };

    /** Returns true if it's an orange or blue portal. */
    const isPortal = (type) => {
        return type === TYPE_ORANGE_PORTAL || type === TYPE_BLUE_PORTAL;
    };

    /** Update entity's (row,col). */
    const updateEntityPos = (entityId, newRow, newCol) => {
        setEntities((prev) =>
            prev.map((e) =>
                e.id === entityId ? { ...e, row: newRow, col: newCol } : e
            )
        );
    };

    /**
                   * Place a portal on the player's cell (for simplicity).
                   * Remove any existing portal of the same color first.
                   * Toggle the color for next time.
                   */
    const placePortal = (color) => {
        if (!player) return;

        const portalType =
            color === 'orange' ? TYPE_ORANGE_PORTAL : TYPE_BLUE_PORTAL;

        // Remove old portal of that color
        setEntities((prev) => prev.filter((e) => e.type !== portalType));

        // Create new portal
        const newId = `portal-${color}-${portalCounter++}`;
        const newPortal = {
            id: newId,
            type: portalType,
            row: player.row,
            col: player.col,
        };

        setEntities((prev) => [...prev, newPortal]);

        // Toggle next portal color
        setNextPortalColor(color === 'orange' ? 'blue' : 'orange');
    };

    // ========== RENDER ==========

    /**
                   * Render an entity at its (row,col) with absolute positioning.
                   * We use a quick CSS transition for sliding.
                   */
    const renderEntity = (entity) => {
        const { id, row, col, type } = entity;
        const style = {
            position: 'absolute',
            width: TILE_SIZE,
            height: TILE_SIZE,
            top: row * TILE_SIZE,
            left: col * TILE_SIZE,
            transition: 'top 0.2s linear, left 0.2s linear',
        };

        // Choose a label or icon
        let label = '';

        switch (type) {
            case TYPE_PLAYER:
                label = 'P';
                break;
            case TYPE_CRATE:
                label = 'C';
                break;
            case TYPE_ICE:
                label = 'I';
                break;
            case TYPE_ORANGE_PORTAL:
                label = 'O';
                break;
            case TYPE_BLUE_PORTAL:
                label = 'B';
                break;
            default:
                break;
        }

        const entityClass = `tile ${type}`;

        return (
            <div key={id} className={entityClass} style={style}>
                {label}
            </div>
        );
    };

    /**
                   * Render walls and floors as static tiles (no animation).
                   */
    const renderBoard = () => {
        const cells = [];

        for (let r = 0; r < NUM_ROWS; r++) {
            for (let c = 0; c < NUM_COLS; c++) {
                const style = {
                    position: 'absolute',
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    top: r * TILE_SIZE,
                    left: c * TILE_SIZE,
                };

                if (walls[r][c]) {
                    cells.push(
                        <div key={`wall-${r}-${c}`} className='tile wall' style={style} />
                    );
                } else {
                    cells.push(
                        <div key={`floor-${r}-${c}`} className='tile empty' style={style} />
                    );
                }
            }
        }

        return cells;
    };

    return (
        <div>
            {/* Inline CSS */}
            <style>{`
        .board {
          position: relative;
          width: ${NUM_COLS * TILE_SIZE}px;
          height: ${NUM_ROWS * TILE_SIZE}px;
          border: 2px solid #333;
          margin: 20px 0;
        }
        .tile {
          box-sizing: border-box;
          border: 1px solid #999;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          font-size: 1.2em;
          user-select: none;
        }
        .empty {
          background-color: #eee;
        }
        .wall {
          background-color: #444;
        }
        .player {
          background-color: #a0e;
          color: #fff;
        }
        .crate {
          background-color: #ca2;
          color: #000;
        }
        .ice {
          background-color: #0cf;
          color: #003;
        }
        .portal-orange {
          background-color: orange;
          color: #fff;
        }
        .portal-blue {
          background-color: blue;
          color: #fff;
        }
      `}</style>
            <h2>Sokoban + Portal + Ice (9×9)</h2>
            <p>
                Use Arrow Keys to move.<br />
                Push crates or ice blocks.<br />
                If ice goes through a portal, it continues sliding on the other side.<br />
                Press <b>O</b> for orange portal, <b>B</b> for blue portal. <br />
                Next portal color: <b>{nextPortalColor}</b>
            </p>
            <div className='board'>
                {renderBoard()}
                {entities.map(renderEntity)}
            </div>
        </div>
    );
}

export default SokobanPortalGame;
