import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import type { Square as SquareType, Position } from '../types';
import { switchPlayer } from '../utils/chessLogic';
import PieceComponent from './Piece';
import { useChessSound } from '../utils/useSound';
import '../styles/ChessBoard.css';

const Board: FC = () => {
    const { state, selectPiece, movePiece } = useGame();
    const { board, selectedPiece, validMoves, currentPlayer, gameStatus } = state;
    const { playSound } = useChessSound();
    const [focusedPosition, setFocusedPosition] = useState<Position>({ row: 0, col: 0 });

    // Play appropriate sounds when game state changes
    useEffect(() => {
        switch (gameStatus) {
            case 'checkmate':
                playSound('checkmate');
                break;
            case 'check':
                playSound('check');
                break;
        }
    }, [gameStatus, playSound]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const { row, col } = focusedPosition;

        switch (e.key) {
            case 'ArrowUp':
                if (row > 0) setFocusedPosition({ row: row - 1, col });
                break;
            case 'ArrowDown':
                if (row < 7) setFocusedPosition({ row: row + 1, col });
                break;
            case 'ArrowLeft':
                if (col > 0) setFocusedPosition({ row, col: col - 1 });
                break;
            case 'ArrowRight':
                if (col < 7) setFocusedPosition({ row, col: col + 1 });
                break;
            case 'Enter':
            case ' ':
                handleSquareClick(board[row][col]);
                break;
        }
    };

    const handleSquareClick = (square: SquareType) => {
        // Deselect piece if clicking on the same square
        if (selectedPiece && selectedPiece.position.row === square.row && selectedPiece.position.col === square.col) {
            selectPiece(undefined);
            return;
        }

        // Handle piece selection and movement
        if (selectedPiece) {
            if (validMoves.some(move => move.row === square.row && move.col === square.col)) {
                // Play capture sound if there's a piece on the target square
                if (square.piece) {
                    playSound('capture');
                } else {
                    playSound('move');
                }
                movePiece(square);
            } else if (square.piece?.color === currentPlayer) {
                selectPiece(square.piece);
            }
        } else if (square.piece?.color === currentPlayer) {
            selectPiece(square.piece);
        }
    };

    return (
        <div 
            className="chess-board"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="grid"
            aria-label="Chess board"
        >
            <div className="board-content">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="row" role="row">
                        {row.map((square, colIndex) => {
                            const isSelected = selectedPiece?.position.row === rowIndex && 
                                            selectedPiece?.position.col === colIndex;
                            const isValidMove = validMoves.some(move => 
                                move.row === rowIndex && move.col === colIndex
                            );
                            const isFocused = focusedPosition.row === rowIndex && 
                                            focusedPosition.col === colIndex;

                            return (
                                <div
                                    key={colIndex}
                                    className={`square ${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}${
                                        isSelected ? ' selected' : ''}${
                                        isValidMove ? ' valid-move' : ''}${
                                        isFocused ? ' focused' : ''}`}
                                    onClick={() => handleSquareClick(square)}
                                    role="gridcell"
                                    aria-label={`${String.fromCharCode(97 + colIndex)}${8 - rowIndex}${
                                        square.piece ? ` - ${square.piece.color} ${square.piece.type}` : ''
                                    }`}
                                    tabIndex={isFocused ? 0 : -1}
                                    onFocus={() => setFocusedPosition({ row: rowIndex, col: colIndex })}
                                >
                                    {square.piece && (
                                        <PieceComponent 
                                            piece={square.piece}
                                            onClick={() => handleSquareClick(square)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="coordinates-x">
                {[...Array(8)].map((_, i) => (
                    <span key={i} className="coordinate">{String.fromCharCode(97 + i)}</span>
                ))}
            </div>
            <div className="coordinates-y">
                {[...Array(8)].map((_, i) => (
                    <span key={i} className="coordinate">{8 - i}</span>
                ))}
            </div>
            {state.gameStatus === 'checkmate' && (
                <div className="game-over" role="alert">
                    Checkmate! {switchPlayer(currentPlayer)} wins!
                </div>
            )}
            {state.gameStatus === 'check' && (
                <div className="check-alert" role="alert">
                    Check!
                </div>
            )}
        </div>
    );
};

export default Board;