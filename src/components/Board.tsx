import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useBot } from '../context/BotContext';
import type { Square as SquareType, Position } from '../types/index';
import { switchPlayer } from '../utils/chessLogic';
import PieceComponent from './Piece';
import ThinkingIndicator from './ThinkingIndicator';
import { useChessSound } from '../utils/useSound';
import '../styles/ChessBoard.css';

const Board: FC = () => {
    const { state, selectPiece, movePiece, isBoardFlipped } = useGame();
    const { board, selectedPiece, validMoves, currentPlayer, gameStatus } = state;
    const { playSound } = useChessSound();
    const [focusedPosition, setFocusedPosition] = useState<Position>({ row: 0, col: 0 });
    const { botColor, makeBotMove, isThinking } = useBot();

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

    // Trigger bot move when it's the bot's turn
    useEffect(() => {
        // Check if it's the bot's turn and the game is still active
        if (currentPlayer === botColor && gameStatus === 'playing' && !isThinking) {
            // Add a small delay for better user experience
            const timeoutId = setTimeout(() => {
                makeBotMove();
            }, 500);
            
            return () => clearTimeout(timeoutId);
        }
    }, [currentPlayer, botColor, gameStatus, isThinking, makeBotMove]); // Fixed: Added makeBotMove dependency

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
        // Don't allow moves during bot's turn
        if (currentPlayer === botColor) {
            return;
        }
        
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

    // Create the board rows in the correct order based on whether the board is flipped
    const renderBoard = () => {
        const rowIndices = [...Array(8).keys()];
        const colIndices = [...Array(8).keys()];
        
        // If the board is flipped, reverse the row and column indices
        const orderedRowIndices = isBoardFlipped ? rowIndices : [...rowIndices].reverse();
        const orderedColIndices = isBoardFlipped ? [...colIndices].reverse() : colIndices;

        return orderedRowIndices.map(rowIndex => (
            <div key={rowIndex} className="row" role="row">
                {orderedColIndices.map(colIndex => {
                    const actualRow = isBoardFlipped ? 7 - rowIndex : rowIndex;
                    const actualCol = isBoardFlipped ? 7 - colIndex : colIndex;
                    const square = board[actualRow][actualCol];
                    
                    const isSelected = selectedPiece?.position.row === actualRow && 
                                    selectedPiece?.position.col === actualCol;
                    const isValidMove = validMoves.some(move => 
                        move.row === actualRow && move.col === actualCol
                    );
                    const isFocused = focusedPosition.row === actualRow && 
                                    focusedPosition.col === actualCol;

                    return (
                        <div
                            key={colIndex}
                            className={`square ${(actualRow + actualCol) % 2 === 0 ? 'light' : 'dark'}${
                                isSelected ? ' selected' : ''}${
                                isValidMove ? ' valid-move' : ''}${
                                square.piece && isValidMove ? ' captured' : ''}${
                                isFocused ? ' focused' : ''}`}
                            onClick={() => handleSquareClick(square)}
                            role="gridcell"
                            aria-label={`${String.fromCharCode(97 + actualCol)}${8 - actualRow}${
                                square.piece ? ` - ${square.piece.color} ${square.piece.type}` : ''
                            }`}
                            tabIndex={isFocused ? 0 : -1}
                            onFocus={() => setFocusedPosition({ row: actualRow, col: actualCol })}
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
        ));
    };

    // Render coordinates around the board based on whether the board is flipped
    const renderCoordinates = () => {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        // Determine the order based on board orientation
        const fileElements = isBoardFlipped ? [...files].reverse() : files;
        const rankElements = isBoardFlipped ? ranks : [...ranks].reverse();

        return (
            <>
                <div className="coordinates-x">
                    {fileElements.map((file) => (
                        <span key={file} className="coordinate">
                            {file}
                        </span>
                    ))}
                </div>
                <div className="coordinates-y">
                    {rankElements.map((rank) => (
                        <span key={rank} className="coordinate">
                            {rank}
                        </span>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div 
            className="chess-board-container"
            tabIndex={0}
            role="grid"
            aria-label="Chess board"
            onKeyDown={handleKeyDown}
        >
            {renderCoordinates()}
            <div className="chess-board">
                <div className="board-content">
                    {renderBoard()}
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
                {isThinking && currentPlayer === botColor && (
                    <ThinkingIndicator />
                )}
            </div>
        </div>
    );
};

export default Board;