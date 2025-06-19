import React, { useEffect, useState } from 'react';
import '../styles/ChessBoard.css';

const ChessBoard: React.FC = () => {
  const [board, setBoard] = useState<string[][]>([]);

  useEffect(() => {
    // Initialize the board with pieces
    const initialBoard = [
      ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
      Array(8).fill('pawn'),
      ...Array(4).fill(Array(8).fill('')),
      Array(8).fill('pawn'),
      ['rook', 'knight', 'bishop', 'king', 'queen', 'bishop', 'knight', 'rook'],
    ];
    setBoard(initialBoard);
  }, []);

  return (
    <div className="chess-board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((piece, colIndex) => (
            <div key={colIndex} className={`box ${(rowIndex + colIndex) % 2 === 0 ? 'white' : 'black'}`}>
              {piece && <i className={`fas fa-chess-${piece}`}></i>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ChessBoard;