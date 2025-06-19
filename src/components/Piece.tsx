import type { FC } from 'react';
import type { Piece } from '../types/index';

interface PieceProps {
    piece: Piece;
    onClick: () => void;
}

const PieceComponent: FC<PieceProps> = ({ piece, onClick }) => {
    const getPieceIcon = () => {
        switch (piece.type) {
            case 'pawn':
                return 'chess-pawn';
            case 'rook':
                return 'chess-rook';
            case 'knight':
                return 'chess-knight';
            case 'bishop':
                return 'chess-bishop';
            case 'queen':
                return 'chess-queen';
            case 'king':
                return 'chess-king';
            default:
                return '';
        }
    };

    return (
        <div 
            className={`piece ${piece.color}`} 
            onClick={onClick}
            role="button"
            aria-label={`${piece.color} ${piece.type}`}
        >
            <i className={`fas fa-${getPieceIcon()}`} />
        </div>
    );
};

export default PieceComponent;