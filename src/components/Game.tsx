import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useBot } from '../context/BotContext';
import Board from './Board';
import styles from './Game.module.css';

export default function Game() {
  const { state } = useGame();
  const { isThinking, botColor, makeBotMove } = useBot();

  useEffect(() => {
    if (state.currentPlayer === botColor) {
      makeBotMove();
    }
  }, [state.currentPlayer, botColor, makeBotMove]);

  return (
    <div className={styles.game}>
      <Board />
      {isThinking && (
        <div className={styles.thinking}>
          Bot is thinking...
        </div>
      )}
      <div className={styles.gameInfo}>
        <div>Current Player: {state.currentPlayer}</div>
        <div>Status: {state.gameStatus}</div>
      </div>
    </div>
  );
}