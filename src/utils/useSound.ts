import { useCallback, useState, useEffect } from 'react';

const AUDIO_FILES = {
    move: '/sounds/move.mp3',
    capture: '/sounds/capture.mp3',
    check: '/sounds/capture.mp3',
    checkmate: '/sounds/capture.mp3'
} as const;

type SoundType = keyof typeof AUDIO_FILES;

const audioCache: { [K in SoundType]?: HTMLAudioElement } = {};

export const useChessSound = () => {
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);

    // Preload audio files
    useEffect(() => {
        Object.entries(AUDIO_FILES).forEach(([type, path]) => {
            const audio = new Audio(path);
            audio.addEventListener('canplaythrough', () => {
                console.log(`Sound loaded successfully: ${path}`);
                audioCache[type as SoundType] = audio;
                setIsAudioLoaded(true);
            });
            audio.addEventListener('error', (e) => {
                console.error(`Failed to load sound ${path}:`, e);
            });
        });
    }, []);

    const playSound = useCallback((type: SoundType) => {
        const audio = audioCache[type];
        if (audio) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch((error) => {
                    console.error(`Error playing sound ${type}:`, error);
                });
            }
        } else {
            console.warn(`Audio not loaded for type: ${type}`);
        }
    }, []);

    return { playSound, isAudioLoaded };
};