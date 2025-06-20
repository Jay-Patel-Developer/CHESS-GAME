import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useGame } from './GameContext';
import type { Position } from '../types/index';
import { getOpeningBookMove } from '../utils/openingBook';

// Define a type for thinking updates
type ThinkingUpdate = {
  depth: number;
  score: number;
  pv?: string;
  isMate?: boolean;
  time?: number;
  nodes?: number;
};

interface BotContextType {
  isThinking: boolean;
  thinkingStats: ThinkingUpdate | null;
  botColor: 'white' | 'black';
  makeBotMove: () => Promise<void>;
  setBotDifficulty: (depth: number) => void;
  toggleBotColor: () => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

function boardToFEN(board: any[][]): string {
  let fen = '';
  for (let row = 0; row < 8; row++) {
    let emptySquares = 0;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (!piece) {
        emptySquares++;
      } else {
        if (emptySquares > 0) {
          fen += emptySquares;
          emptySquares = 0;
        }
        const pieceSymbol = getPieceSymbol(piece.type, piece.color);
        fen += pieceSymbol;
      }
    }
    if (emptySquares > 0) {
      fen += emptySquares;
    }
    if (row < 7) fen += '/';
  }
  return fen;
}

function getPieceSymbol(type: string, color: string): string {
  const symbols: { [key: string]: string } = {
    pawn: 'p',
    rook: 'r',
    knight: 'n',
    bishop: 'b',
    queen: 'q',
    king: 'k'
  };
  const symbol = symbols[type];
  return color === 'white' ? symbol.toUpperCase() : symbol;
}

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStats, setThinkingStats] = useState<ThinkingUpdate | null>(null);
  const { state, selectPiece, movePiece, resetGame } = useGame();
  const [botColor, setBotColor] = useState<'white' | 'black'>('black');
  const workerRef = useRef<Worker | null>(null);
  const moveResolveRef = useRef<((move: string | null) => void) | null>(null);
  const [searchDepth, setSearchDepth] = useState<number>(3); // Shallow depth for faster responses
  // Track start time for performance logging
  const startTimeRef = useRef<number>(0);
  // Flag to track if the worker is ready
  const [workerReady, setWorkerReady] = useState<boolean>(false);
  // Queue of pending move requests
  const pendingMoveRef = useRef<boolean>(false);
  // Track worker initialization attempts
  const initAttemptsRef = useRef<number>(0);

  // Set the bot's difficulty level
  const setBotDifficulty = (depth: number) => {
    console.log(`Setting bot difficulty to depth ${depth}`);
    setSearchDepth(depth);
  };
  
  // Toggle the bot's color between white and black
  const toggleBotColor = () => {
    setBotColor(prevColor => {
      const newColor = prevColor === 'white' ? 'black' : 'white';
      console.log(`Switched bot color from ${prevColor} to ${newColor}`);
      resetGame();
      return newColor;
    });
  };

  // Initialize the engine worker - with improved error handling
  const initializeWorker = () => {
    if (typeof Worker === 'undefined') {
      console.error('Web Workers are not supported in this browser');
      setWorkerReady(false);
      return;
    }
    
    // If we already have a worker that's initializing or ready, don't create a new one
    if (workerRef.current && workerReady) {
      console.log('Worker already initialized and ready');
      return;
    }
    
    if (workerRef.current) {
      console.log('Worker already exists, terminating before recreating');
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    console.log('Creating Stockfish worker instance...');
    try {
      const worker = new Worker(new URL('../workers/stockfishWorker.ts', import.meta.url), 
        { type: 'module' });
      
      worker.onmessage = (e) => {
        const { type, move, data, message, source, reason, fallbackMode } = e.data;
        console.log('Received message from worker:', type, move || data || message);
        
        switch (type) {
          case 'ready':
            if (fallbackMode) {
              console.log('🔄 Engine ready in fallback mode - using built-in move generator');
              console.log('📝 Reason:', message || 'No Stockfish URLs available');
            } else {
              console.log('✅ Stockfish engine is ready');
            }
            
            setWorkerReady(true);
            initAttemptsRef.current = 0; // Reset attempts counter on success
            
            // Check if there's a pending move request
            if (pendingMoveRef.current) {
              console.log('Processing pending move request after worker initialization');
              pendingMoveRef.current = false;
              makeBotMove();
            }
            break;
            
          case 'bestMove':
            if (!move) {
              console.error('Received bestMove message without a move');
              break;
            }
            
            const totalTime = Date.now() - startTimeRef.current;
            
            // Log different sources of moves with appropriate emoji
            if (source === 'fallback') {
              const reasonText = reason === 'no_urls_available' ? 'no CDN available' : 
                               reason === 'engine_not_ready' ? 'engine not ready' :
                               reason === 'timeout_fallback' ? 'engine timeout' : reason;
              console.log(`🧮 Fallback move generated: ${move} in ${totalTime}ms (${reasonText})`);
            } else if (source === 'stockfish') {
              console.log(`🚀 Stockfish move: ${move} in ${totalTime}ms`);
            } else {
              console.log(`🎯 Best move found: ${move} in ${totalTime}ms`);
            }
            
            if (moveResolveRef.current) {
              moveResolveRef.current(move);
              moveResolveRef.current = null;
              setThinkingStats(null);
            } else {
              console.error('Received bestMove but no resolver function was set');
              // Try to apply the move anyway since we have it
              applyBotMove(move);
            }
            break;
          case 'evaluation':
            // Only show evaluation data if we're using Stockfish (not fallback)
            if (!data || source === 'fallback') break;
            
            const update: ThinkingUpdate = {
              depth: data.depth,
              score: data.score,
              isMate: data.isMate,
              pv: data.pv,
              time: data.time,
              nodes: data.nodes
            };
            setThinkingStats(update);
            
            // Log detailed thinking information
            const timeStr = data.time ? `${(data.time / 1000).toFixed(2)}s` : '';
            const nodeStr = data.nodes ? `${(data.nodes / 1000).toFixed(0)}k nodes` : '';
            const scoreStr = data.isMate ? `mate in ${data.score}` : `cp ${data.score}`;
            
            console.log(`🤔 Thinking: depth ${data.depth}, ${scoreStr}, ${timeStr}, ${nodeStr}`);
            if (data.pv) {
              console.log(`📝 Line: ${data.pv}`);
            }
            break;
          case 'message':
            console.log('Stockfish:', message);
            break;
          case 'error':
            console.error('Stockfish error:', message);
            
            // Handle different types of errors
            if (message?.includes('initialization')) {
              setWorkerReady(false);
            } else if (message?.includes('fallback unavailable') || message?.includes('No engine available')) {
              console.warn('All fallback systems failed, using alternative piece selection');
              if (moveResolveRef.current) {
                moveResolveRef.current(null); // This will trigger alternative piece selection
                moveResolveRef.current = null;
              }
            }
            
            // Reset thinking state on error
            setIsThinking(false);
            setThinkingStats(null);
            break;
        }
      };
      
      worker.onerror = (error) => {
        console.error('Stockfish worker error:', error);
        setIsThinking(false);
        setWorkerReady(false);
        
        if (moveResolveRef.current) {
          moveResolveRef.current('');
          moveResolveRef.current = null;
        }
        
        // Since we've enhanced our worker's error handling, don't immediately 
        // retry here to avoid infinite loops
        if (initAttemptsRef.current < 3) {
          retryWorkerInitialization();
        } else {
          console.log('Not retrying worker initialization after repeated failures');
        }
      };
      
      // Save worker reference
      workerRef.current = worker;
      
      // Initialize the worker
      console.log('Initializing Stockfish worker...');
      worker.postMessage({ cmd: 'init' });
      
      // Set a timeout to check if initialization succeeded
      // Use a longer timeout (20 seconds) to match the worker's timeout
      setTimeout(() => {
        if (!workerReady) {
          console.warn('Worker initialization timed out after 20 seconds');
          retryWorkerInitialization();
        }
      }, 20000);
      
    } catch (error) {
      console.error('Failed to create Stockfish worker:', error);
      setWorkerReady(false);
      retryWorkerInitialization();
    }
  };
  
  const retryWorkerInitialization = () => {
    if (initAttemptsRef.current >= 3) {
      console.error('Failed to initialize Stockfish worker after multiple attempts, giving up');
      setWorkerReady(false);  // Make sure we mark the worker as not ready
      return;
    }
    
    initAttemptsRef.current++;
    console.log(`Retrying worker initialization, attempt ${initAttemptsRef.current}...`);
    
    // Wait a bit before retrying (increase delay with each attempt)
    setTimeout(() => {
      initializeWorker();
    }, 2000 * initAttemptsRef.current); // Progressive backoff
  };
  
  useEffect(() => {
    // Initialize the Stockfish worker
    initializeWorker();
    
    return () => {
      console.log('Terminating Stockfish worker...');
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setWorkerReady(false);
    };
  }, []);

  const applyBotMove = (bestMove: string) => {
    if (!bestMove || bestMove === '(none)') {
      console.warn('Invalid move received from bot:', bestMove);
      return;
    }
    
    try {
      const from = bestMove.substring(0, 2);
      const to = bestMove.substring(2, 4);
      
      console.log(`Applying bot move: ${from} to ${to}`);
      
      const fromPos = algebraicToPosition(from);
      const toPos = algebraicToPosition(to);

      console.log(`Positions - from: ${JSON.stringify(fromPos)}, to: ${JSON.stringify(toPos)}`);

      // Double-check position is valid on the board
      if (fromPos.row < 0 || fromPos.row > 7 || fromPos.col < 0 || fromPos.col > 7 ||
          toPos.row < 0 || toPos.row > 7 || toPos.col < 0 || toPos.col > 7) {
        console.error(`Invalid position in move ${bestMove}`);
        useAlternativePiece();
        return;
      }

      const piece = state.board[fromPos.row][fromPos.col].piece;
      if (!piece) {
        console.error(`No piece found at position ${from} (${fromPos.row}, ${fromPos.col})`);
        useAlternativePiece();
        return;
      }
      
      if (piece.color !== botColor) {
        console.error(`Piece at ${from} is ${piece.color}, not ${botColor}`);
        useAlternativePiece();
        return;
      }
      
      console.log(`Found piece at ${from}:`, piece);
      
      // First select the piece to populate validMoves
      selectPiece(piece);
      
      // Give the context a moment to update, then validate and make the move
      setTimeout(() => {
        // Get fresh valid moves after piece selection
        import('../utils/chessLogic').then(({ calculateValidMoves }) => {
          const validMoves = calculateValidMoves(piece, state.board);
          
          // Verify that the target position is a valid move
          const isValidMove = validMoves.some(
            move => move.row === toPos.row && move.col === toPos.col
          );
          
          if (!isValidMove) {
            console.error(`Invalid move for ${piece.type} to ${to}. Valid moves:`, validMoves);
            useAlternativePiece();
            return;
          }
          
          // Then move it to the target square
          const targetSquare = state.board[toPos.row][toPos.col];
          movePiece(targetSquare);
          
          console.log(`Move completed: ${piece.color} ${piece.type} from ${from} to ${to}`);
        });
      }, 50); // Small delay to allow state update
      
    } catch (error) {
      console.error('Error applying bot move:', error);
      useAlternativePiece();
    }
  };
  
  // Helper function to find and move a different piece when the intended move fails
  const useAlternativePiece = () => {
    console.log("Finding an alternative piece to move...");
    
    // Find all pieces of the bot color that have valid moves
    let movablePieces: Array<{piece: any, validMoves: Position[]}> = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const currentPiece = state.board[row][col].piece;
        if (currentPiece && currentPiece.color === botColor) {
          // Select this piece to see what valid moves it has
          selectPiece(currentPiece);
          
          // If it has valid moves, add it to our collection
          if (state.validMoves.length > 0) {
            movablePieces.push({
              piece: currentPiece,
              validMoves: [...state.validMoves]
            });
          }
        }
      }
    }
    
    // Deselect any piece that might be selected
    selectPiece(undefined);
    
    if (movablePieces.length === 0) {
      console.error(`Could not find any ${botColor} piece with valid moves`);
      return;
    }
    
    console.log(`Found ${movablePieces.length} ${botColor} pieces with valid moves`);
    
    // Prioritize pieces: knights > bishops > rooks > queen > pawns > king
    // This ensures development in the opening and avoids moving the king unnecessarily
    const pieceValue: {[key: string]: number} = {
      'knight': 5,
      'bishop': 4,
      'rook': 3,
      'queen': 2,
      'pawn': 1,
      'king': 0
    };
    
    // Sort pieces by priority
    movablePieces.sort((a, b) => {
      return (pieceValue[b.piece.type] || 0) - (pieceValue[a.piece.type] || 0);
    });
    
    // Choose a piece and move it
    const chosenPiece = movablePieces[0].piece;
    const validMove = movablePieces[0].validMoves[0];
    
    console.log(`Moving alternative piece: ${chosenPiece.type} at (${chosenPiece.position.row}, ${chosenPiece.position.col})`);
    
    selectPiece(chosenPiece);
    movePiece(state.board[validMove.row][validMove.col]);
    
    console.log(`Alternative move completed: ${chosenPiece.color} ${chosenPiece.type} to (${validMove.row}, ${validMove.col})`);
  }

  const makeBotMove = async () => {
    // Safety checks
    if (!workerRef.current) {
      console.error('Stockfish worker not available');
      return;
    }
    
    if (!workerReady) {
      console.log('Worker not ready yet, setting pending move flag');
      pendingMoveRef.current = true;
      return;
    }
    
    if (state.currentPlayer !== botColor || state.gameStatus !== 'playing') {
      console.log(`Not bot's turn or game not in playing state. Current player: ${state.currentPlayer}, Bot: ${botColor}, Game status: ${state.gameStatus}`);
      return;
    }

    console.log('Making bot move...');
    setIsThinking(true);
    startTimeRef.current = Date.now();
    console.log(`🧠 Bot (${botColor}) starting to think at depth ${searchDepth}...`);
    
    try {
      // Create a complete FEN string
      const boardFen = boardToFEN(state.board);
      const currentPlayer = state.currentPlayer === 'white' ? 'w' : 'b';
      const fullFen = `${boardFen} ${currentPlayer} KQkq - 0 1`;
      
      console.log(`Current board position: ${fullFen}`);
      
      // First check if we have a book move for this position
      const bookMove = getOpeningBookMove(fullFen);
      if (bookMove) {
        console.log(`📚 Found opening book move: ${bookMove}`);
        setTimeout(() => {
          applyBotMove(bookMove);
          setIsThinking(false);
        }, 500); // Small delay to show thinking indicator
        return;
      }
      
      // Use a faster search for early game moves
      const gameStage = calculateGameStage(state.board);
      const actualDepth = adjustDepthForGameStage(searchDepth, gameStage);
      
      // Calculate dynamic timeout based on game stage and difficulty
      const baseTimeout = gameStage === 'opening' ? 800 : gameStage === 'endgame' ? 2000 : 1500;
      const maxTimeout = Math.min(8000, baseTimeout * (searchDepth / 3)); // Scale with difficulty
      
      console.log(`Game stage: ${gameStage}, depth: ${actualDepth}, timeout: ${baseTimeout}-${maxTimeout}ms`);
      
      const bestMove = await new Promise<string | null>((resolve) => {
        moveResolveRef.current = resolve;
        
        // Set a longer timeout than the worker's max timeout to let it handle retries
        const overallTimeoutId = setTimeout(() => {
          console.log('Overall timeout reached, the worker should have used fallback by now');
          if (moveResolveRef.current) {
            console.log('Using alternative piece selection due to overall timeout');
            moveResolveRef.current(null);
            moveResolveRef.current = null;
          }
          workerRef.current?.postMessage({ cmd: 'stop' });
        }, maxTimeout + 2000); // Give extra time for worker's retry logic
        
        try {
          // Send enhanced evaluation request with progressive timeout parameters
          workerRef.current?.postMessage({ 
            cmd: 'evaluate', 
            payload: { 
              fen: fullFen,
              depth: actualDepth,
              movetime: baseTimeout,
              maxTimeout: maxTimeout,
              requestId: `${Date.now()}-${botColor}`
            } 
          });
        } catch (error) {
          console.error('Error sending evaluate command to worker:', error);
          clearTimeout(overallTimeoutId);
          resolve(null); // Use alternative piece on error
        }
        
        // Clear timeout when move is received
        const originalResolve = moveResolveRef.current;
        moveResolveRef.current = (move) => {
          clearTimeout(overallTimeoutId);
          originalResolve(move || null); // Use alternative if move is empty
        };
      });

      if (bestMove) {
        console.log(`Received best move from engine: ${bestMove}`);
        applyBotMove(bestMove);
      } else {
        console.warn('No move received from bot, using alternative piece');
        useAlternativePiece();
      }
    } catch (error) {
      console.error('Bot error:', error);
      // Use alternative piece selection instead of hardcoded fallback moves
      console.log('Using alternative piece selection due to error');
      useAlternativePiece();
    } finally {
      setIsThinking(false);
    }
  };

  // Helper function to determine game stage (opening, middlegame, endgame)
  const calculateGameStage = (board: any[][]): 'opening' | 'middlegame' | 'endgame' => {
    let pieceCount = 0;
    let developedPieces = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col].piece;
        if (piece) {
          pieceCount++;
          
          // Count moved non-pawn pieces as "developed"
          if (piece.type !== 'pawn' && piece.hasMoved) {
            developedPieces++;
          }
        }
      }
    }
    
    if (pieceCount <= 12) {
      return 'endgame';
    } else if (developedPieces >= 6 || state.moveHistory.length > 20) {
      return 'middlegame';
    } else {
      return 'opening';
    }
  };
  
  // Adjust search depth based on game stage
  const adjustDepthForGameStage = (baseDepth: number, stage: 'opening' | 'middlegame' | 'endgame'): number => {
    switch (stage) {
      case 'opening':
        return Math.min(baseDepth, 12); // Use book moves or lower depth in opening
      case 'middlegame':
        return baseDepth;
      case 'endgame':
        return baseDepth + 3; // Search deeper in endgame positions
      default:
        return baseDepth;
    }
  };

  return (
    <BotContext.Provider value={{ 
      isThinking, 
      thinkingStats,
      botColor, 
      makeBotMove,
      setBotDifficulty,
      toggleBotColor
    }}>
      {children}
    </BotContext.Provider>
  );
}

function algebraicToPosition(algebraic: string): Position {
  const col = algebraic.charCodeAt(0) - 97; // 'a' is 97 in ASCII
  const row = 8 - parseInt(algebraic[1]);
  
  // Ensure coordinates are within valid range (0-7)
  const validCol = Math.max(0, Math.min(7, col));
  const validRow = Math.max(0, Math.min(7, row));
  
  // Log the conversion for debugging
  console.log(`Converting ${algebraic} to board position: row ${validRow}, col ${validCol}`);
  
  return { row: validRow, col: validCol };
}

export function useBot() {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot must be used within BotProvider');
  }
  return context;
}