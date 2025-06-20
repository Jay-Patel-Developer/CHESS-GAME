import React from 'react';
import { useBot } from '../context/BotContext';

const PlayerColorSelector: React.FC = () => {
  const { botColor, toggleBotColor } = useBot();
  const playerColor = botColor === 'white' ? 'black' : 'white';

  return (
    <div className="player-color-selector">
      <h3>Play as</h3>
      <div className="color-options">
        <div 
          className={`color-option ${playerColor === 'white' ? 'active' : ''}`} 
          onClick={() => {
            if (playerColor !== 'white') toggleBotColor();
          }}
        >
          <div className="color-icon white"></div>
          <span>White</span>
        </div>
        <div 
          className={`color-option ${playerColor === 'black' ? 'active' : ''}`} 
          onClick={() => {
            if (playerColor !== 'black') toggleBotColor();
          }}
        >
          <div className="color-icon black"></div>
          <span>Black</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerColorSelector;