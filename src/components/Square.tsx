import React from 'react';
import type { Square as SquareType } from '../types/index';

interface SquareProps {
    square: SquareType;
    isSelected: boolean;
    onClick: (square: SquareType) => void;
}

const Square: React.FC<SquareProps> = ({ square, isSelected, onClick }) => {
    const squareClass = `square ${isSelected ? 'selected' : ''} ${square.row % 2 === square.col % 2 ? 'white' : 'black'}`;

    return (
        <div className={squareClass} onClick={() => onClick(square)}>
            {square.piece && (
                <div className={`piece ${square.piece.color}`}>
                    {square.piece.type}
                </div>
            )}
        </div>
    );
};

export default Square;