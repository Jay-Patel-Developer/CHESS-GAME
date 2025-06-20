import React from 'react';
import { useBot } from '../context/BotContext';

const ThinkingIndicator: React.FC = () => {
  const { isThinking, thinkingStats, botColor } = useBot();
  
  if (!isThinking || !thinkingStats) {
    return null;
  }

  const { depth, score, isMate, time, nodes, pv } = thinkingStats;
  
  // Format time as seconds if available
  const timeText = time ? `${(time / 1000).toFixed(2)}s` : '';
  
  // Format nodes as k or M if available
  const formatNodes = (n?: number) => {
    if (!n) return '';
    return n >= 1000000 
      ? `${(n / 1000000).toFixed(2)}M nodes` 
      : `${(n / 1000).toFixed(0)}k nodes`;
  };
  
  // Format score with sign and color
  const formatScore = (s: number, mate: boolean) => {
    const scoreClass = s > 0 ? 'positive-score' : s < 0 ? 'negative-score' : '';
    const sign = s > 0 ? '+' : '';
    return (
      <span className={scoreClass}>
        {mate ? `mate in ${Math.abs(s)}` : `${sign}${s.toFixed(2)}`}
      </span>
    );
  };
  
  // Render a visual progress bar based on depth
  const depthPercent = Math.min(100, (depth / 20) * 100);
  
  return (
    <div className="thinking-indicator-detailed">
      <div className="thinking-header">
        <i className="fas fa-cog fa-spin"></i> 
        <span className="bot-color">{botColor.charAt(0).toUpperCase() + botColor.slice(1)}</span> is thinking...
      </div>
      
      <div className="thinking-stats">
        <div className="stat-row">
          <div className="stat-label">Depth:</div>
          <div className="stat-value depth-value">
            {depth}
            <div className="depth-bar">
              <div className="depth-progress" style={{ width: `${depthPercent}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="stat-row">
          <div className="stat-label">Evaluation:</div>
          <div className="stat-value">{formatScore(score, !!isMate)}</div>
        </div>
        
        {(time || nodes) && (
          <div className="stat-row">
            <div className="stat-label">Performance:</div>
            <div className="stat-value">
              {timeText} {formatNodes(nodes)}
            </div>
          </div>
        )}
        
        {pv && (
          <div className="thinking-moves">
            <div className="moves-label">Considering:</div>
            <div className="moves-sequence">{pv.split(' ').slice(0, 5).join(', ')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThinkingIndicator;