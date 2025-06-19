import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Board from './components/Board';
import '@/styles/App.css';

const GameContent: React.FC = () => {
    const { state, resetGame } = useGame();
    
    return (
        <div className="app">
            <div className="game-controls">
                <h1>Chess Game</h1>
                <div className="status-bar">
                    <div className="current-player">
                        Current Player: <span className={state.currentPlayer}>{state.currentPlayer}</span>
                    </div>
                    <button className="reset-button" onClick={resetGame}>
                        New Game
                    </button>
                </div>
            </div>
            <div className="game-container">
                <div className="captured-pieces">
                    <div className="captured-section">
                        <h3>Black's Captures</h3>
                        <div className="white-captured">
                            {state.capturedPieces.white.map((piece, i) => (
                                <i key={i} 
                                   className={`fas fa-chess-${piece.type} white`}
                                   title={`${piece.type} captured by black`}>
                                </i>
                            ))}
                        </div>
                    </div>
                    <div className="chess-board-container">
                        <Board />
                    </div>
                    <div className="captured-section">
                        <h3>White's Captures</h3>
                        <div className="black-captured">
                            {state.capturedPieces.black.map((piece, i) => (
                                <i key={i} 
                                   className={`fas fa-chess-${piece.type} black`}
                                   title={`${piece.type} captured by white`}>
                                </i>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <GameProvider>
            <GameContent />
        </GameProvider>
    );
};

export default App;