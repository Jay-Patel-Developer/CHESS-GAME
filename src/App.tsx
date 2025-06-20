import { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { BotProvider, useBot } from './context/BotContext';
import Board from './components/Board';
import MoveHistory from './components/MoveHistory';
import GameTimer from './components/GameTimer';
import DifficultySelector from './components/DifficultySelector';
import GameOptions from './components/GameOptions';
import PlayerColorSelector from './components/PlayerColorSelector';
import './styles/App.css';
import './styles/ChessTheme.css';

const GameContent: React.FC = () => {
    const { state, resetGame, undoLastMove, isBoardFlipped, flipBoard } = useGame();
    const { isThinking, botColor, setBotDifficulty } = useBot();
    const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

    // Reset the move index whenever a new game starts
    useEffect(() => {
        if (state.moveHistory.length === 0) {
            setCurrentMoveIndex(-1);
        } else {
            setCurrentMoveIndex(state.moveHistory.length - 1);
        }
    }, [state.moveHistory.length]);

    return (
        <div className="app-container">
            <div className="chess-layout">
                <div className="side-panel left-panel">
                    <div className="player-info">
                        <div className="player-color player-black"></div>
                        <div className="player-name">
                            {botColor === 'black' ? 'Bot (Stockfish)' : 'Player 2'}
                        </div>
                        <GameTimer player="black" />
                    </div>
                    
                    <div className="captured-pieces">
                        {state.capturedPieces.white.map((piece, i) => (
                            <i key={i} 
                              className={`fas fa-chess-${piece.type} captured-piece white`}
                              title={`${piece.type} captured by black`}>
                            </i>
                        ))}
                    </div>

                    {botColor === 'black' && isThinking && state.currentPlayer === 'black' && (
                        <div className="thinking-indicator">
                            <i className="fas fa-cog fa-spin"></i>
                            Bot is thinking...
                        </div>
                    )}

                    <PlayerColorSelector />
                    
                    <GameOptions 
                        isBoardFlipped={isBoardFlipped}
                        onFlipBoard={flipBoard}
                        onNewGame={resetGame}
                        onUndoMove={undoLastMove}
                    />

                    <DifficultySelector onChange={setBotDifficulty} />
                </div>
                
                <div className="game-container">
                    <div className="chess-board-wrapper">
                        <Board />
                    </div>
                    
                    <div className="game-status">
                        {state.gameStatus === 'checkmate' && (
                            <div className="game-over-message">
                                Checkmate! {state.currentPlayer === 'white' ? 'Black' : 'White'} wins!
                            </div>
                        )}
                        {state.gameStatus === 'check' && (
                            <div className="check-message">
                                {state.currentPlayer} is in check!
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="side-panel right-panel">
                    <div className="player-info">
                        <div className="player-color player-white"></div>
                        <div className="player-name">
                            {botColor === 'white' ? 'Bot (Stockfish)' : 'Player 1'}
                        </div>
                        <GameTimer player="white" />
                    </div>
                    
                    <div className="captured-pieces">
                        {state.capturedPieces.black.map((piece, i) => (
                            <i key={i} 
                              className={`fas fa-chess-${piece.type} captured-piece black`}
                              title={`${piece.type} captured by white`}>
                            </i>
                        ))}
                    </div>

                    {botColor === 'white' && isThinking && state.currentPlayer === 'white' && (
                        <div className="thinking-indicator">
                            <i className="fas fa-cog fa-spin"></i>
                            Bot is thinking...
                        </div>
                    )}
                    
                    <div className="game-info-panel">
                        <div className="current-turn">
                            Current Turn: <span className={state.currentPlayer}>{state.currentPlayer}</span>
                        </div>
                        
                        <MoveHistory 
                            moves={state.moveHistory} 
                            currentIndex={currentMoveIndex}
                            onSelectMove={setCurrentMoveIndex}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <>
            <header className="app-header">
                <div className="logo">
                    <i className="fas fa-chess-knight"></i>
                    Chess Game
                </div>
                <nav className="nav-links">
                    <button className="btn btn-secondary">
                        <i className="fas fa-question-circle"></i> Help
                    </button>
                </nav>
            </header>
            
            <GameProvider>
                <BotProvider>
                    <GameContent />
                </BotProvider>
            </GameProvider>
            
            <footer className="app-footer">
                <p>© 2025 Chess Game. Built with React and Stockfish.</p>
            </footer>
        </>
    );
};

export default App;