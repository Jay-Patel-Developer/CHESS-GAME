export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PlayerColor = 'white' | 'black';
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate';
export type Position = { row: number; col: number };

export type Piece = {
    type: PieceType;
    color: PlayerColor;
    position: Position;
    hasMoved?: boolean;
};

export type Square = {
    row: number;
    col: number;
    piece: Piece | undefined;
};

export type Move = {
    piece: Piece;
    from: Position;
    to: Position;
    captured?: Piece | undefined;
    isCheck?: boolean;
    isCheckmate?: boolean;
};

export type GameState = {
    board: Square[][];
    currentPlayer: PlayerColor;
    selectedPiece: Piece | undefined;
    validMoves: Position[];
    gameStatus: GameStatus;
    capturedPieces: {
        white: Piece[];
        black: Piece[];
    };
    moveHistory: Move[];
    isCheck: boolean;
    isCheckmate: boolean;
};

// Ensure GameState is exported
export type { GameState };