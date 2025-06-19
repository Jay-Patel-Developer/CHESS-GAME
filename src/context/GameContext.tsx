import React, { createContext, useContext, useReducer } from 'react';
import type { GameState, Piece, Square } from '../types';
import { initializeBoard, calculateValidMoves, isMoveValid, isCheckmate, switchPlayer } from '../utils/chessLogic';

interface GameContextType {
    state: GameState;
    selectPiece: (piece: Piece | undefined) => void;
    movePiece: (toSquare: Square) => void;
    resetGame: () => void;
}

const initialState: GameState = {
    board: initializeBoard(),
    currentPlayer: 'white',
    selectedPiece: undefined,
    validMoves: [],
    gameStatus: 'playing',
    capturedPieces: { white: [], black: [] },
    moveHistory: [],
    isCheck: false,
    isCheckmate: false
};

type GameAction = 
    | { type: 'SELECT_PIECE'; piece: Piece | undefined }
    | { type: 'MOVE_PIECE'; toSquare: Square }
    | { type: 'RESET_GAME' }
    | { type: 'UPDATE_GAME_STATUS' };

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SELECT_PIECE': {
            if (!action.piece) {
                return {
                    ...state,
                    selectedPiece: undefined,
                    validMoves: []
                };
            }

            if (action.piece.color !== state.currentPlayer) {
                return state;
            }

            const validMoves = calculateValidMoves(action.piece, state.board);
            return {
                ...state,
                selectedPiece: action.piece,
                validMoves
            };
        }

        case 'MOVE_PIECE': {
            if (!state.selectedPiece || !isMoveValid(state.selectedPiece, action.toSquare, state.validMoves)) {
                return state;
            }

            const newBoard = JSON.parse(JSON.stringify(state.board));
            const capturedPiece = action.toSquare.piece;
            const newCapturedPieces = {
                white: [...state.capturedPieces.white],
                black: [...state.capturedPieces.black]
            };

            // Update captured pieces based on the capturing player's color
            if (capturedPiece) {
                if (state.currentPlayer === 'white') {
                    newCapturedPieces.black = [...newCapturedPieces.black, capturedPiece];
                } else {
                    newCapturedPieces.white = [...newCapturedPieces.white, capturedPiece];
                }
            }

            // Update piece position and mark as moved
            const movedPiece = {
                ...state.selectedPiece,
                position: { row: action.toSquare.row, col: action.toSquare.col },
                hasMoved: true
            };

            // Clear the original position
            newBoard[state.selectedPiece.position.row][state.selectedPiece.position.col].piece = undefined;
            // Place the piece in the new position
            newBoard[action.toSquare.row][action.toSquare.col].piece = movedPiece;

            const nextPlayer = switchPlayer(state.currentPlayer);
            const newIsCheckmate = isCheckmate(newBoard, nextPlayer);
            const newIsCheck = false; // This will be updated properly in a future implementation

            return {
                ...state,
                board: newBoard,
                currentPlayer: nextPlayer,
                selectedPiece: undefined,
                validMoves: [],
                capturedPieces: newCapturedPieces,
                moveHistory: [...state.moveHistory, {
                    piece: state.selectedPiece,
                    from: state.selectedPiece.position,
                    to: { row: action.toSquare.row, col: action.toSquare.col },
                    captured: capturedPiece,
                    isCheck: newIsCheck,
                    isCheckmate: newIsCheckmate
                }],
                isCheck: newIsCheck,
                isCheckmate: newIsCheckmate,
                gameStatus: newIsCheckmate ? 'checkmate' : newIsCheck ? 'check' : 'playing'
            };
        }

        case 'RESET_GAME':
            return {
                ...initialState,
                board: initializeBoard()
            };

        default:
            return state;
    }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    const selectPiece = (piece: Piece | undefined) => {
        dispatch({ type: 'SELECT_PIECE', piece });
    };

    const movePiece = (toSquare: Square) => {
        dispatch({ type: 'MOVE_PIECE', toSquare });
    };

    const resetGame = () => {
        dispatch({ type: 'RESET_GAME' });
    };

    return (
        <GameContext.Provider value={{ state, selectPiece, movePiece, resetGame }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

// Export GameContext if needed elsewhere
export { GameContext };