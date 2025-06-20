import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

interface GameTimerProps {
  player: 'white' | 'black';
}

const INITIAL_TIME = 10 * 60; // 10 minutes in seconds

const GameTimer: React.FC<GameTimerProps> = ({ player }) => {
  const { state } = useGame();
  const [time, setTime] = useState(INITIAL_TIME);
  const intervalRef = useRef<number | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start/stop timer based on whose turn it is and game status
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only run the timer if the game is playing and it's this player's turn
    if (state.gameStatus === 'playing' && state.currentPlayer === player) {
      intervalRef.current = window.setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 0) {
            // Time's up, should handle game over
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.currentPlayer, state.gameStatus, player]);

  // Reset timer when starting a new game
  useEffect(() => {
    if (state.moveHistory.length === 0) {
      setTime(INITIAL_TIME);
    }
  }, [state.moveHistory.length]);

  return (
    <div className={`timer ${time < 60 ? 'timer-urgent' : ''}`}>
      {formatTime(time)}
    </div>
  );
};

export default GameTimer;