import React from 'react';
import type { Move } from '../types';

interface MoveHistoryProps {
    moves: Move[];
    currentIndex: number;
    onSelectMove: (index: number) => void;
}

/**
 * Component that displays the history of moves in algebraic notation
 */
const MoveHistory: React.FC<MoveHistoryProps> = ({ moves, currentIndex, onSelectMove }) => {
    // Convert position to algebraic notation (e.g. {row: 0, col: 0} -> "a8")
    const positionToAlgebraic = (pos: { row: number, col: number }): string => {
        const file = String.fromCharCode(97 + pos.col); // 'a' is 97 in ASCII
        const rank = 8 - pos.row;
        return `${file}${rank}`;
    };

    // Format move for display in algebraic notation
    const formatMove = (move: Move): string => {
        const from = positionToAlgebraic(move.from);
        const to = positionToAlgebraic(move.to);
        let notation = '';
        
        // Add piece symbol (except for pawns)
        if (move.piece.type !== 'pawn') {
            const symbols: Record<string, string> = {
                'king': 'K',
                'queen': 'Q',
                'rook': 'R',
                'bishop': 'B',
                'knight': 'N'
            };
            notation += symbols[move.piece.type];
        }
        
        // Add capture symbol
        if (move.captured) {
            // For pawns, add the starting file when capturing
            if (move.piece.type === 'pawn') {
                notation += from[0];
            }
            notation += 'x';
        }
        
        notation += to;
        
        // Add check or checkmate symbol
        if (move.isCheckmate) {
            notation += '#';
        } else if (move.isCheck) {
            notation += '+';
        }
        
        return notation;
    };

    // Group moves into pairs for white and black
    const moveRows = [];
    for (let i = 0; i < moves.length; i += 2) {
        moveRows.push({
            number: Math.floor(i / 2) + 1,
            white: moves[i],
            black: i + 1 < moves.length ? moves[i + 1] : null
        });
    }

    return (
        <div className="moves-history">
            <div className="moves-header">Move History</div>
            {moveRows.length === 0 ? (
                <div className="no-moves">No moves yet</div>
            ) : (
                <div className="moves-list">
                    {moveRows.map((row, rowIndex) => (
                        <div key={row.number} className="move-row">
                            <div className="move-number">{row.number}.</div>
                            <div 
                                className={`move ${currentIndex === rowIndex * 2 ? 'current' : ''}`}
                                onClick={() => onSelectMove(rowIndex * 2)}
                            >
                                {formatMove(row.white)}
                            </div>
                            {row.black && (
                                <div 
                                    className={`move ${currentIndex === rowIndex * 2 + 1 ? 'current' : ''}`}
                                    onClick={() => onSelectMove(rowIndex * 2 + 1)}
                                >
                                    {formatMove(row.black)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MoveHistory;