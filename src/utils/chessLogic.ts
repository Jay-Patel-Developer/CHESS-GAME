import type { Piece, Square, Position, PlayerColor, PieceType } from '../types';

// This file contains utility functions for chess logic, including functions to calculate valid moves and check for game conditions.

export const initializeBoard = (): Square[][] => {
    const board: Square[][] = Array(8).fill(null).map((_, row) => 
        Array(8).fill(null).map((_, col) => ({
            row,
            col,
            piece: undefined
        }))
    );

    // Initialize pieces
    const setupPiece = (type: PieceType, color: PlayerColor, row: number, col: number) => {
        board[row][col].piece = {
            type,
            color,
            position: { row, col },
            hasMoved: false
        };
    };

    // Setup back rows
    const backRowPieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    backRowPieces.forEach((type, col) => {
        setupPiece(type, 'black', 0, col);
        setupPiece(type, 'white', 7, col);
    });

    // Setup pawns
    for (let col = 0; col < 8; col++) {
        setupPiece('pawn', 'black', 1, col);
        setupPiece('pawn', 'white', 6, col);
    }

    return board;
};

export const isPositionValid = (pos: Position): boolean => {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
};

export const calculateValidMoves = (piece: Piece, board: Square[][]): Position[] => {
    const moves: Position[] = [];
    const { row, col } = piece.position;

    const addMove = (pos: Position) => {
        if (!isPositionValid(pos)) return false;
        const targetSquare = board[pos.row][pos.col];
        if (!targetSquare.piece) {
            moves.push(pos);
            return true;
        }
        if (targetSquare.piece.color !== piece.color) {
            moves.push(pos);
        }
        return false;
    };

    const addSlidingMoves = (directions: Position[]) => {
        directions.forEach(({ row: dr, col: dc }) => {
            let r = row + dr;
            let c = col + dc;
            while (isPositionValid({ row: r, col: c })) {
                if (!addMove({ row: r, col: c })) break;
                r += dr;
                c += dc;
            }
        });
    };

    switch (piece.type) {
        case 'pawn': {
            const direction = piece.color === 'white' ? -1 : 1;
            const startRow = piece.color === 'white' ? 6 : 1;
            
            // Forward moves
            const oneStep = { row: row + direction, col };
            if (isPositionValid(oneStep) && !board[oneStep.row][oneStep.col].piece) {
                moves.push(oneStep);
                
                // Two-step initial move
                if (row === startRow) {
                    const twoStep = { row: row + 2 * direction, col };
                    if (!board[twoStep.row][twoStep.col].piece) {
                        moves.push(twoStep);
                    }
                }
            }

            // Captures
            const captures = [{ row: row + direction, col: col - 1 }, { row: row + direction, col: col + 1 }];
            captures.forEach(pos => {
                if (isPositionValid(pos)) {
                    const targetSquare = board[pos.row][pos.col];
                    if (targetSquare.piece && targetSquare.piece.color !== piece.color) {
                        moves.push(pos);
                    }
                }
            });
            break;
        }

        case 'knight': {
            const knightMoves = [
                { row: row + 2, col: col + 1 }, { row: row + 2, col: col - 1 },
                { row: row - 2, col: col + 1 }, { row: row - 2, col: col - 1 },
                { row: row + 1, col: col + 2 }, { row: row + 1, col: col - 2 },
                { row: row - 1, col: col + 2 }, { row: row - 1, col: col - 2 }
            ];
            knightMoves.forEach(pos => addMove(pos));
            break;
        }

        case 'bishop': {
            addSlidingMoves([
                { row: 1, col: 1 }, { row: 1, col: -1 },
                { row: -1, col: 1 }, { row: -1, col: -1 }
            ]);
            break;
        }

        case 'rook': {
            addSlidingMoves([
                { row: 0, col: 1 }, { row: 0, col: -1 },
                { row: 1, col: 0 }, { row: -1, col: 0 }
            ]);
            break;
        }

        case 'queen': {
            addSlidingMoves([
                { row: 0, col: 1 }, { row: 0, col: -1 },
                { row: 1, col: 0 }, { row: -1, col: 0 },
                { row: 1, col: 1 }, { row: 1, col: -1 },
                { row: -1, col: 1 }, { row: -1, col: -1 }
            ]);
            break;
        }

        case 'king': {
            const kingMoves = [
                { row: row + 1, col }, { row: row - 1, col },
                { row, col: col + 1 }, { row, col: col - 1 },
                { row: row + 1, col: col + 1 }, { row: row + 1, col: col - 1 },
                { row: row - 1, col: col + 1 }, { row: row - 1, col: col - 1 }
            ];
            kingMoves.forEach(pos => addMove(pos));

            // Castling
            if (!piece.hasMoved && !isInCheck(board, piece.color)) {
                // Kingside castling
                if (canCastle(board, piece.color, 'kingside')) {
                    moves.push({ row, col: col + 2 });
                }
                // Queenside castling
                if (canCastle(board, piece.color, 'queenside')) {
                    moves.push({ row, col: col - 2 });
                }
            }
            break;
        }
    }

    // Filter out moves that would put or leave the king in check
    return moves.filter(move => !wouldBeInCheck(board, piece, move));
};

const canCastle = (board: Square[][], color: PlayerColor, side: 'kingside' | 'queenside'): boolean => {
    const row = color === 'white' ? 7 : 0;
    const kingCol = 4;
    const rookCol = side === 'kingside' ? 7 : 0;
    
    const king = board[row][kingCol].piece;
    const rook = board[row][rookCol].piece;
    
    if (!king || !rook || king.hasMoved || rook.hasMoved) return false;
    
    const direction = side === 'kingside' ? 1 : -1;
    const endCol = side === 'kingside' ? 6 : 2;
    
    // Check if path is clear
    for (let col = kingCol + direction; side === 'kingside' ? col < rookCol : col > rookCol; col += direction) {
        if (board[row][col].piece) return false;
    }
    
    // Check if path is not under attack
    for (let col = kingCol; side === 'kingside' ? col <= endCol : col >= endCol; col += direction) {
        if (isSquareUnderAttack(board, { row, col }, color)) return false;
    }
    
    return true;
};

const isInCheck = (board: Square[][], color: PlayerColor): boolean => {
    const king = findKing(board, color);
    if (!king) return false;
    return isSquareUnderAttack(board, king.position, color);
};

const findKing = (board: Square[][], color: PlayerColor): Piece | null => {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col].piece;
            if (piece?.type === 'king' && piece.color === color) {
                return piece;
            }
        }
    }
    return null;
};

const calculateBasicMoves = (piece: Piece, board: Square[][]): Position[] => {
    const moves: Position[] = [];
    const { row, col } = piece.position;

    const addMove = (pos: Position) => {
        if (!isPositionValid(pos)) return false;
        const targetSquare = board[pos.row][pos.col];
        if (!targetSquare.piece) {
            moves.push(pos);
            return true;
        }
        if (targetSquare.piece.color !== piece.color) {
            moves.push(pos);
        }
        return false;
    };

    const addSlidingMoves = (directions: Position[]) => {
        directions.forEach(({ row: dr, col: dc }) => {
            let r = row + dr;
            let c = col + dc;
            while (isPositionValid({ row: r, col: c })) {
                if (!addMove({ row: r, col: c })) break;
                r += dr;
                c += dc;
            }
        });
    };

    switch (piece.type) {
        case 'pawn': {
            const direction = piece.color === 'white' ? -1 : 1;
            // Only include capture moves for pawns when checking attacks
            const captures = [{ row: row + direction, col: col - 1 }, { row: row + direction, col: col + 1 }];
            captures.forEach(pos => {
                if (isPositionValid(pos)) {
                    moves.push(pos);
                }
            });
            break;
        }
        case 'knight': {
            const knightMoves = [
                { row: row + 2, col: col + 1 }, { row: row + 2, col: col - 1 },
                { row: row - 2, col: col + 1 }, { row: row - 2, col: col - 1 },
                { row: row + 1, col: col + 2 }, { row: row + 1, col: col - 2 },
                { row: row - 1, col: col + 2 }, { row: row - 1, col: col - 2 }
            ];
            knightMoves.forEach(pos => addMove(pos));
            break;
        }
        case 'bishop': {
            addSlidingMoves([
                { row: 1, col: 1 }, { row: 1, col: -1 },
                { row: -1, col: 1 }, { row: -1, col: -1 }
            ]);
            break;
        }
        case 'rook': {
            addSlidingMoves([
                { row: 0, col: 1 }, { row: 0, col: -1 },
                { row: 1, col: 0 }, { row: -1, col: 0 }
            ]);
            break;
        }
        case 'queen': {
            addSlidingMoves([
                { row: 0, col: 1 }, { row: 0, col: -1 },
                { row: 1, col: 0 }, { row: -1, col: 0 },
                { row: 1, col: 1 }, { row: 1, col: -1 },
                { row: -1, col: 1 }, { row: -1, col: -1 }
            ]);
            break;
        }
        case 'king': {
            const kingMoves = [
                { row: row + 1, col }, { row: row - 1, col },
                { row, col: col + 1 }, { row, col: col - 1 },
                { row: row + 1, col: col + 1 }, { row: row + 1, col: col - 1 },
                { row: row - 1, col: col + 1 }, { row: row - 1, col: col - 1 }
            ];
            kingMoves.forEach(pos => addMove(pos));
            break;
        }
    }
    return moves;
};

const isSquareUnderAttack = (board: Square[][], position: Position, defendingColor: PlayerColor): boolean => {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col].piece;
            if (piece && piece.color !== defendingColor) {
                const moves = calculateBasicMoves(piece, board);
                if (moves.some(move => move.row === position.row && move.col === position.col)) {
                    return true;
                }
            }
        }
    }
    return false;
};

const wouldBeInCheck = (board: Square[][], piece: Piece, move: Position): boolean => {
    // Create a deep copy of the board
    const tempBoard = JSON.parse(JSON.stringify(board));
    
    // Make the move on the temporary board
    tempBoard[piece.position.row][piece.position.col].piece = null;
    tempBoard[move.row][move.col].piece = { ...piece, position: move };
    
    return isInCheck(tempBoard, piece.color);
};

export const isCheckmate = (board: Square[][], color: PlayerColor): boolean => {
    if (!isInCheck(board, color)) return false;

    // Check if any piece can make a move that gets out of check
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col].piece;
            if (piece && piece.color === color) {
                const moves = calculateValidMoves(piece, board);
                if (moves.length > 0) return false;
            }
        }
    }
    return true;
};

export const isStalemate = (board: Square[][], color: PlayerColor): boolean => {
    if (isInCheck(board, color)) return false;

    // Check if any piece can make a legal move
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col].piece;
            if (piece && piece.color === color) {
                const moves = calculateValidMoves(piece, board);
                if (moves.length > 0) return false;
            }
        }
    }
    return true;
};

export const switchPlayer = (currentPlayer: PlayerColor): PlayerColor => {
    return currentPlayer === 'white' ? 'black' : 'white';
};

export const isMoveValid = (_piece: Piece, toSquare: Square, validMoves: Position[]): boolean => {
    return validMoves.some(move => move.row === toSquare.row && move.col === toSquare.col);
};