import React, { createContext, useContext, useState } from 'react';
import { useGame } from './GameContext';
import type { Position } from '../types';

interface BotContextType {
  isThinking: boolean;
  botColor: 'white' | 'black';
  makeBotMove: () => Promise<void>;
}

declare global {
  interface Window {
    puter: any; // Add proper types when available
  }
}

const BotContext = createContext<BotContextType | undefined>(undefined);

function boardToFEN(board: any[][]): string {
  let fen = '';
  for (let row = 0; row < 8; row++) {
    let emptySquares = 0;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (!piece) {
        emptySquares++;
      } else {
        if (emptySquares > 0) {
          fen += emptySquares;
          emptySquares = 0;
        }
        const pieceSymbol = getPieceSymbol(piece.type, piece.color);
        fen += pieceSymbol;
      }
    }
    if (emptySquares > 0) {
      fen += emptySquares;
    }
    if (row < 7) fen += '/';
  }
  return fen;
}

function getPieceSymbol(type: string, color: string): string {
  const symbols: { [key: string]: string } = {
    pawn: 'p',
    rook: 'r',
    knight: 'n',
    bishop: 'b',
    queen: 'q',
    king: 'k'
  };
  const symbol = symbols[type];
  return color === 'white' ? symbol.toUpperCase() : symbol;
}

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [isThinking, setIsThinking] = useState(false);
  const { state, selectPiece, movePiece } = useGame();
  const botColor = 'white';

  const makeBotMove = async () => {
    if (state.currentPlayer !== botColor || state.gameStatus !== 'playing') {
      return;
    }

    setIsThinking(true);
    try {
      const fen = boardToFEN(state.board);
      const result = await window.puter.chess.getBestMove(fen, {
        depth: 3,
        timeout: 2000
      });

      if (result && result.bestMove) {
        const [from, to] = result.bestMove.match(/.{2}/g) || [];
        const fromPos = algebraicToPosition(from);
        const toPos = algebraicToPosition(to);

        const piece = state.board[fromPos.row][fromPos.col].piece;
        if (piece) {
          selectPiece(piece);
          movePiece(state.board[toPos.row][toPos.col]);
        }
      }
    } catch (error) {
      console.error('Bot error:', error);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <BotContext.Provider value={{ isThinking, botColor, makeBotMove }}>
      {children}
    </BotContext.Provider>
  );
}

function algebraicToPosition(algebraic: string): Position {
  const col = algebraic.charCodeAt(0) - 97; // 'a' is 97 in ASCII
  const row = 8 - parseInt(algebraic[1]);
  return { row, col };
}

export function useBot() {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot must be used within BotProvider');
  }
  return context;
}