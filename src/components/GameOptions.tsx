import React from 'react';

interface GameOptionsProps {
  isBoardFlipped: boolean;
  onFlipBoard: () => void;
  onNewGame: () => void;
  onUndoMove: () => void;
}

const GameOptions: React.FC<GameOptionsProps> = ({
  isBoardFlipped,
  onFlipBoard,
  onNewGame,
  onUndoMove
}) => {
  return (
    <div className="game-options">
      <h3>Game Options</h3>
      <div className="options-container">
        <button className="btn" onClick={onNewGame}>
          <i className="fas fa-redo-alt"></i> New Game
        </button>
        <button className="btn" onClick={onFlipBoard}>
          <i className="fas fa-exchange-alt"></i> Flip Board {isBoardFlipped ? '(Black View)' : '(White View)'}
        </button>
        <button className="btn" onClick={onUndoMove}>
          <i className="fas fa-undo"></i> Undo Move
        </button>
      </div>
    </div>
  );
};

export default GameOptions;