import React, { useState } from 'react';

interface DifficultySelectorProps {
    onChange: (depth: number) => void;
}

/**
 * Component for selecting the difficulty level (search depth) for the chess engine
 */
const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onChange }) => {
    const [activeLevel, setActiveLevel] = useState(2); // Medium difficulty by default
    
    const difficultyLevels = [
        { name: "Easy", depth: 1 },
        { name: "Medium", depth: 2 },
        { name: "Hard", depth: 4 },
        { name: "Expert", depth: 16 }
    ];
    
    const handleLevelClick = (index: number) => {
        setActiveLevel(index);
        onChange(difficultyLevels[index].depth);
    };
    
    return (
        <div className="difficulty-selector">
            <div className="difficulty-label">Difficulty:</div>
            <div className="difficulty-options">
                {difficultyLevels.map((level, index) => (
                    <div
                        key={level.name}
                        className={`difficulty-level ${activeLevel === index ? 'active' : ''}`}
                        onClick={() => handleLevelClick(index)}
                        title={`Engine search depth: ${level.depth}`}
                    >
                        {level.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DifficultySelector;