// Simple opening book with common responses to popular openings
// Map format: FEN position (partial) => best move in algebraic notation

const openingBook: Record<string, string> = {
  // Common responses to 1.d4 (Queen's Pawn Opening)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 'g8f6', // 1...Nf6 (Indian Defence)
  
  // Alternative responses to 1.d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq': 'd7d5', // 1...d5 (Queen's Pawn Defence)
  
  // Common responses to 1.e4 (King's Pawn Opening)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': 'e7e5', // 1...e5 (Open Game)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': 'c7c5', // 1...c5 (Sicilian Defence)
  
  // Responses to other common openings
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b': 'g8f6', // 1.c4 Nf6 (English Opening)
  'rnbqkbnr/pppppppp/8/8/1P6/8/P1PPPPPP/RNBQKBNR b': 'e7e5', // 1.b4 e5 (Polish Opening)
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b': 'd7d5', // 1.Nf3 d5 (Réti Opening)
  
  // Some common second moves
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w': 'g1f3', // 1.e4 e5 2.Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b': 'b8c6', // 1.e4 e5 2.Nf3 Nc6
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w': 'f1b5', // 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Ruy Lopez)
};

export function getOpeningBookMove(fen: string): string | null {
  // Try with the full FEN
  if (openingBook[fen]) {
    return openingBook[fen];
  }
  
  // Try with just the position part (before any space)
  const positionPart = fen.split(' ')[0];
  if (openingBook[positionPart]) {
    return openingBook[positionPart];
  }
  
  // Try with position + current player
  const positionAndTurn = fen.split(' ').slice(0, 2).join(' ');
  if (openingBook[positionAndTurn]) {
    return openingBook[positionAndTurn];
  }
  
  // Try with position + current player + castling rights
  const positionTurnCastling = fen.split(' ').slice(0, 3).join(' ');
  if (openingBook[positionTurnCastling]) {
    return openingBook[positionTurnCastling];
  }
  
  return null;
}

// Update the defaultFallbackMoves to have multiple options for both colors
export const defaultFallbackMoves: {
  [color: string]: {
    opening: string;
    fallback: string;
    alternatives: string[];
  }
} = {
  white: {
    opening: 'e2e4',
    fallback: 'g1f3', // Knight to f3
    alternatives: ['d2d4', 'c2c4', 'g1f3', 'b1c3', 'f2f4']
  },
  black: {
    opening: 'd7d5',
    fallback: 'e7e5', // e-pawn two steps
    alternatives: ['e7e5', 'c7c5', 'g8f6', 'b8c6', 'e7e6']
  }
};

export default openingBook;