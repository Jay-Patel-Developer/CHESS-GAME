// This web worker loads Stockfish.js from a CDN and provides an interface to communicate with it

/// <reference lib="webworker" />

// Define a simple interface for Stockfish engine
interface StockfishEngine {
  postMessage: (message: string) => void;
  onmessage: ((message: string) => void) | null;
}

// Interface for evaluation requests with retry logic
interface EvaluationRequest {
  fen: string;
  depth?: number;
  movetime?: number;
  maxTimeout?: number;
  attemptCount?: number;
  requestId?: string;
}

// Variable to hold the stockfish engine instance
let engine: StockfishEngine | null = null;
// Flag to prevent duplicate initialization
let isInitializing = false;
// Track initialization attempts
let initAttempts = 0;
// Maximum number of initialization attempts
const MAX_ATTEMPTS = 5;
// Use a much longer timeout for slow connections
const INIT_TIMEOUT_MS = 20000; // 20 seconds

// Progressive timeout system
const MIN_TIMEOUT = 500; // Start with 500ms
const MAX_TIMEOUT = 10000; // Max 10 seconds
const TIMEOUT_MULTIPLIER = 1.5; // Increase by 50% each retry

// Active evaluation tracking
let currentEvaluation: {
  request: EvaluationRequest;
  timeoutId: NodeJS.Timeout | null;
  startTime: number;
} | null = null;

// List of URLs to try (prioritize the working CDN first)
const STOCKFISH_URLS = [
  // Working CDN source (confirmed working)
  'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
  // Keep local as backup in case CDN becomes unavailable
  '/engine/stockfish.js',
  // Other CDN fallbacks (keeping these but with lower priority)
  'https://cdn.jsdelivr.net/npm/stockfish@14.1.0/stockfish.js',
  'https://unpkg.com/stockfish@14.1.0/stockfish.js'
];

// URL availability status tracking
let urlAvailabilityCache: { [url: string]: { available: boolean; lastChecked: number } } = {};
const URL_CHECK_TIMEOUT = 5000; // 5 seconds for URL availability check
const CACHE_DURATION = 300000; // Cache for 5 minutes

// Flag to indicate if we should skip Stockfish entirely and use fallback
let useDirectFallback = false;

// Set up message handling
self.onmessage = async (e: MessageEvent) => {
  const { cmd, payload } = e.data;
  console.log(`Worker received command: ${cmd}`, payload);
  
  switch (cmd) {
    case 'init':
      if (!engine && !isInitializing) {
        await initStockfish();
      } else if (engine) {
        // Engine already initialized, just notify ready
        self.postMessage({ type: 'ready' });
      }
      break;
    case 'evaluate':
      await handleEvaluationRequest(payload);
      break;
    case 'command':
      if (engine && typeof payload === 'string') {
        console.log(`Worker: Sending engine command: ${payload}`);
        engine.postMessage(payload);
      }
      break;
    case 'stop':
      if (engine) {
        console.log("Worker: Stopping engine");
        engine.postMessage('stop');
      }
      // Clear any pending evaluation
      if (currentEvaluation?.timeoutId) {
        clearTimeout(currentEvaluation.timeoutId);
        currentEvaluation = null;
      }
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
  }
};

// Quick URL availability check with short timeout
async function checkUrlAvailability(url: string): Promise<boolean> {
  const now = Date.now();
  
  // Check cache first
  const cached = urlAvailabilityCache[url];
  if (cached && (now - cached.lastChecked) < CACHE_DURATION) {
    console.log(`Worker: Using cached availability for ${url}: ${cached.available}`);
    return cached.available;
  }
  
  console.log(`Worker: Checking availability of ${url}...`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT);
    
    // Use HEAD request for faster checking
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: url.startsWith('/') ? 'same-origin' : 'cors',
      credentials: 'omit',
      cache: 'no-cache' // Don't cache the check itself
    });
    
    clearTimeout(timeoutId);
    
    const available = response.ok && response.status === 200;
    
    // Cache the result
    urlAvailabilityCache[url] = {
      available,
      lastChecked: now
    };
    
    console.log(`Worker: URL ${url} availability: ${available} (status: ${response.status})`);
    return available;
    
  } catch (error) {
    console.warn(`Worker: URL availability check failed for ${url}:`, error);
    
    // Cache as unavailable
    urlAvailabilityCache[url] = {
      available: false,
      lastChecked: now
    };
    
    return false;
  }
}

// Check all URLs for availability and return the first working one
async function findWorkingStockfishUrl(): Promise<string | null> {
  console.log('Worker: Checking Stockfish URL availability...');
  
  for (const url of STOCKFISH_URLS) {
    const available = await checkUrlAvailability(url);
    if (available) {
      console.log(`Worker: Found working Stockfish URL: ${url}`);
      return url;
    }
  }
  
  console.warn('Worker: No working Stockfish URLs found, will use direct fallback');
  return null;
}

// Enhanced evaluation handler with URL checking
async function handleEvaluationRequest(request: EvaluationRequest): Promise<void> {
  // If we've determined all URLs are unavailable, use direct fallback
  if (useDirectFallback || !engine) {
    if (useDirectFallback) {
      console.log("Worker: Using direct fallback mode (no Stockfish URLs available)");
    } else {
      console.log("Worker: Engine not initialized, using fallback move generation");
    }
    
    const fallbackMove = await generateFallbackMove(request.fen);
    if (fallbackMove) {
      console.log(`Worker: Generated direct fallback move: ${fallbackMove}`);
      self.postMessage({ 
        type: 'bestMove', 
        move: fallbackMove, 
        source: 'fallback',
        reason: useDirectFallback ? 'no_urls_available' : 'engine_not_ready'
      });
      return;
    }
    
    self.postMessage({ type: 'error', message: 'No engine available and fallback generation failed' });
    return;
  }

  // Initialize request parameters
  const attemptCount = request.attemptCount || 1;
  const maxTimeout = request.maxTimeout || MAX_TIMEOUT;
  const requestId = request.requestId || Date.now().toString();
  
  // Calculate progressive timeout
  const baseTimeout = request.movetime || MIN_TIMEOUT;
  const progressiveTimeout = Math.min(
    baseTimeout * Math.pow(TIMEOUT_MULTIPLIER, attemptCount - 1),
    maxTimeout
  );
  
  console.log(`Worker: Evaluation attempt ${attemptCount} with ${progressiveTimeout}ms timeout`);
  
  // Clear any existing evaluation
  if (currentEvaluation?.timeoutId) {
    clearTimeout(currentEvaluation.timeoutId);
  }
  
  // Set up timeout for this evaluation attempt
  const timeoutId = setTimeout(async () => {
    console.warn(`Worker: Evaluation timeout after ${progressiveTimeout}ms (attempt ${attemptCount})`);
    
    const totalElapsed = Date.now() - (currentEvaluation?.startTime || Date.now());
    
    // Check if we should retry with longer timeout
    if (attemptCount < 3 && totalElapsed < maxTimeout) {
      console.log(`Worker: Retrying evaluation with longer timeout...`);
      
      // Stop current engine calculation
      if (engine) {
        engine.postMessage('stop');
      }
      
      // Retry with increased timeout
      const retryRequest: EvaluationRequest = {
        ...request,
        attemptCount: attemptCount + 1,
        requestId
      };
      
      setTimeout(() => handleEvaluationRequest(retryRequest), 100);
      return;
    }
    
    // If we've exhausted retries or time, try fallback
    console.log(`Worker: Max retries reached, attempting fallback move generation...`);
    
    const fallbackMove = await generateFallbackMove(request.fen);
    if (fallbackMove) {
      console.log(`Worker: Generated fallback move: ${fallbackMove}`);
      self.postMessage({ 
        type: 'bestMove', 
        move: fallbackMove, 
        source: 'fallback',
        reason: 'timeout_fallback'
      });
    } else {
      self.postMessage({ 
        type: 'error', 
        message: `Evaluation failed after ${attemptCount} attempts and fallback unavailable`
      });
    }
    
    currentEvaluation = null;
  }, progressiveTimeout);
  
  // Track current evaluation
  currentEvaluation = {
    request: { ...request, attemptCount, requestId },
    timeoutId,
    startTime: Date.now()
  };
  
  // Start evaluation with progressive depth and time
  const depth = Math.max(1, Math.min(request.depth || 5, attemptCount + 2)); // Increase depth with retries
  
  console.log(`Worker: Starting evaluation - Depth: ${depth}, Time: ${progressiveTimeout}ms`);
  
  engine.postMessage(`position fen ${request.fen}`);
  engine.postMessage(`go depth ${depth} movetime ${progressiveTimeout}`);
}

// Smart fallback move generation using basic chess algorithms
async function generateFallbackMove(fen: string): Promise<string | null> {
  try {
    console.log('Worker: Generating fallback move using basic algorithms...');
    
    // Parse FEN to get board state
    const boardState = parseFEN(fen);
    if (!boardState) {
      console.error('Worker: Failed to parse FEN for fallback');
      return null;
    }
    
    // Generate all legal moves
    const legalMoves = generateLegalMoves(boardState);
    if (legalMoves.length === 0) {
      console.error('Worker: No legal moves available');
      return null;
    }
    
    console.log(`Worker: Found ${legalMoves.length} legal moves for fallback`);
    
    // Apply move selection algorithm (prioritize captures, then central control)
    const rankedMoves = rankMoves(legalMoves, boardState);
    
    // Return the best move from our basic algorithm
    return rankedMoves[0]?.move || legalMoves[0];
    
  } catch (error) {
    console.error('Worker: Error in fallback move generation:', error);
    return null;
  }
}

// Basic FEN parser for fallback move generation
function parseFEN(fen: string): any | null {
  try {
    const parts = fen.split(' ');
    if (parts.length < 4) return null;
    
    const [position, activeColor, castling, enPassant] = parts;
    
    // Convert FEN position to 8x8 board array
    const ranks = position.split('/');
    const board: (string | null)[][] = [];
    
    for (const rank of ranks) {
      const row: (string | null)[] = [];
      for (const char of rank) {
        if (char >= '1' && char <= '8') {
          // Empty squares
          const emptyCount = parseInt(char);
          for (let i = 0; i < emptyCount; i++) {
            row.push(null);
          }
        } else {
          // Piece
          row.push(char);
        }
      }
      board.push(row);
    }
    
    return {
      board,
      activeColor,
      castling,
      enPassant,
      isWhiteToMove: activeColor === 'w'
    };
  } catch (error) {
    console.error('Worker: FEN parsing error:', error);
    return null;
  }
}

// Generate legal moves using basic chess rules
function generateLegalMoves(boardState: any): string[] {
  const moves: string[] = [];
  const { board, isWhiteToMove } = boardState;
  
  // Iterate through board to find pieces of current player
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;
      
      const isWhitePiece = piece === piece.toUpperCase();
      if (isWhitePiece !== isWhiteToMove) continue;
      
      // Generate moves for this piece
      const pieceMoves = generatePieceMoves(piece, rank, file, board);
      moves.push(...pieceMoves);
    }
  }
  
  return moves;
}

// Generate moves for a specific piece
function generatePieceMoves(piece: string, rank: number, file: number, board: any[][]): string[] {
  const moves: string[] = [];
  const pieceType = piece.toLowerCase();
  
  const fromSquare = `${String.fromCharCode(97 + file)}${8 - rank}`;
  
  // Basic move generation for different piece types
  switch (pieceType) {
    case 'p': // Pawn
      moves.push(...generatePawnMoves(piece, rank, file, board));
      break;
    case 'r': // Rook
      moves.push(...generateSlidingMoves(rank, file, board, [[0,1], [0,-1], [1,0], [-1,0]]));
      break;
    case 'n': // Knight
      moves.push(...generateKnightMoves(rank, file, board));
      break;
    case 'b': // Bishop
      moves.push(...generateSlidingMoves(rank, file, board, [[1,1], [1,-1], [-1,1], [-1,-1]]));
      break;
    case 'q': // Queen
      moves.push(...generateSlidingMoves(rank, file, board, [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]));
      break;
    case 'k': // King
      moves.push(...generateKingMoves(rank, file, board));
      break;
  }
  
  return moves.map(toSquare => `${fromSquare}${toSquare}`);
}

// Helper functions for move generation
function generatePawnMoves(piece: string, rank: number, file: number, board: any[][]): string[] {
  const moves: string[] = [];
  const isWhite = piece === piece.toUpperCase();
  const direction = isWhite ? -1 : 1;
  const startRank = isWhite ? 6 : 1;
  
  // Forward move
  const newRank = rank + direction;
  if (newRank >= 0 && newRank < 8 && !board[newRank][file]) {
    moves.push(`${String.fromCharCode(97 + file)}${8 - newRank}`);
    
    // Double move from starting position
    if (rank === startRank && !board[newRank + direction]?.[file]) {
      moves.push(`${String.fromCharCode(97 + file)}${8 - (newRank + direction)}`);
    }
  }
  
  // Captures
  for (const captureFile of [file - 1, file + 1]) {
    if (captureFile >= 0 && captureFile < 8 && newRank >= 0 && newRank < 8) {
      const target = board[newRank][captureFile];
      if (target && (target === target.toUpperCase()) !== isWhite) {
        moves.push(`${String.fromCharCode(97 + captureFile)}${8 - newRank}`);
      }
    }
  }
  
  return moves;
}

function generateSlidingMoves(rank: number, file: number, board: any[][], directions: number[][]): string[] {
  const moves: string[] = [];
  const piece = board[rank][file];
  const isWhite = piece === piece.toUpperCase();
  
  for (const [dr, df] of directions) {
    for (let i = 1; i < 8; i++) {
      const newRank = rank + dr * i;
      const newFile = file + df * i;
      
      if (newRank < 0 || newRank >= 8 || newFile < 0 || newFile >= 8) break;
      
      const target = board[newRank][newFile];
      if (!target) {
        moves.push(`${String.fromCharCode(97 + newFile)}${8 - newRank}`);
      } else {
        if ((target === target.toUpperCase()) !== isWhite) {
          moves.push(`${String.fromCharCode(97 + newFile)}${8 - newRank}`);
        }
        break;
      }
    }
  }
  
  return moves;
}

function generateKnightMoves(rank: number, file: number, board: any[][]): string[] {
  const moves: string[] = [];
  const piece = board[rank][file];
  const isWhite = piece === piece.toUpperCase();
  
  const knightMoves = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];
  
  for (const [dr, df] of knightMoves) {
    const newRank = rank + dr;
    const newFile = file + df;
    
    if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
      const target = board[newRank][newFile];
      if (!target || (target === target.toUpperCase()) !== isWhite) {
        moves.push(`${String.fromCharCode(97 + newFile)}${8 - newRank}`);
      }
    }
  }
  
  return moves;
}

function generateKingMoves(rank: number, file: number, board: any[][]): string[] {
  const moves: string[] = [];
  const piece = board[rank][file];
  const isWhite = piece === piece.toUpperCase();
  
  const kingMoves = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
  
  for (const [dr, df] of kingMoves) {
    const newRank = rank + dr;
    const newFile = file + df;
    
    if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
      const target = board[newRank][newFile];
      if (!target || (target === target.toUpperCase()) !== isWhite) {
        moves.push(`${String.fromCharCode(97 + newFile)}${8 - newRank}`);
      }
    }
  }
  
  return moves;
}

// Rank moves using basic chess principles
function rankMoves(moves: string[], boardState: any): { move: string; score: number }[] {
  return moves.map(move => ({
    move,
    score: evaluateMove(move, boardState)
  })).sort((a, b) => b.score - a.score);
}

// Basic move evaluation using chess principles
function evaluateMove(move: string, boardState: any): number {
  let score = 0;
  const { board } = boardState;
  
  const fromFile = move.charCodeAt(0) - 97;
  const fromRank = 8 - parseInt(move[1]);
  const toFile = move.charCodeAt(2) - 97;
  const toRank = 8 - parseInt(move[3]);
  
  const piece = board[fromRank][fromFile];
  const target = board[toRank][toFile];
  
  // Prioritize captures
  if (target) {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const targetValue = pieceValues[target.toLowerCase() as keyof typeof pieceValues] || 0;
    const pieceValue = pieceValues[piece.toLowerCase() as keyof typeof pieceValues] || 0;
    
    // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    score += (targetValue * 10) - pieceValue;
  }
  
  // Prefer central squares
  const centerDistance = Math.abs(toFile - 3.5) + Math.abs(toRank - 3.5);
  score += (7 - centerDistance) * 0.1;
  
  // Slight bonus for piece development (moving from back rank)
  if (fromRank === 0 || fromRank === 7) {
    score += 0.2;
  }
  
  return score;
}

// Enhanced message handling for engine responses
// Function to initialize Stockfish engine
async function initStockfish() {
  if (isInitializing) {
    console.log("Worker: Already initializing, skipping duplicate init request");
    return;
  }
  
  if (initAttempts >= MAX_ATTEMPTS) {
    console.error(`Worker: Max initialization attempts (${MAX_ATTEMPTS}) reached, giving up`);
    self.postMessage({ 
      type: 'error', 
      message: 'Failed to initialize Stockfish engine after multiple attempts' 
    });
    return;
  }
  
  isInitializing = true;
  initAttempts++;
  console.log(`Worker: Initializing Stockfish engine (attempt ${initAttempts}/${MAX_ATTEMPTS})`);
  
  try {
    // First check if any Stockfish URLs are available
    const workingUrl = await findWorkingStockfishUrl();
    
    if (!workingUrl) {
      console.warn('Worker: No working Stockfish URLs found, switching to direct fallback mode');
      useDirectFallback = true;
      isInitializing = false;
      
      // Notify that we're ready but in fallback mode
      self.postMessage({ 
        type: 'ready', 
        fallbackMode: true,
        message: 'Engine ready in fallback mode - using built-in move generator'
      });
      return;
    }
    
    // First fetch the Stockfish code from the working URL
    const stockfishCode = await fetchStockfishFromUrl(workingUrl);
    
    // Create a blob with the stockfish code and get a URL for it
    const blob = new Blob([stockfishCode], { type: 'application/javascript' });
    const stockfishWorkerUrl = URL.createObjectURL(blob);
    
    // Create a new worker with the blob URL
    const stockfishWorker = new Worker(stockfishWorkerUrl);
    console.log("Worker: Created Stockfish worker from blob URL");
    
    // Set up a timeout to detect initialization failure
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      console.error(`Worker: Stockfish initialization timed out after ${INIT_TIMEOUT_MS/1000} seconds`);
      isInitializing = false;
      
      // Switch to fallback mode instead of retrying
      console.log('Worker: Switching to fallback mode due to initialization timeout');
      useDirectFallback = true;
      
      // Clean up
      URL.revokeObjectURL(stockfishWorkerUrl);
      
      // Notify main thread that we're ready in fallback mode
      self.postMessage({ 
        type: 'ready', 
        fallbackMode: true,
        message: 'Engine ready in fallback mode after timeout'
      });
      
    }, INIT_TIMEOUT_MS);
    
    // Create engine interface to communicate with Stockfish
    engine = {
      postMessage: (message) => {
        stockfishWorker.postMessage(message);
      },
      onmessage: null
    };
    
    // Handle messages from the Stockfish worker
    stockfishWorker.onmessage = (e: MessageEvent) => {
      const message = e.data;
      
      // Log for debugging
      if (typeof message === 'string' && (message.includes('readyok') || message.includes('bestmove'))) {
        console.log(`Worker received from engine: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      }
      
      // Check for "readyok" message which indicates engine is ready
      if (typeof message === 'string' && message.includes('readyok')) {
        console.log("Worker: Stockfish engine is ready");
        
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        isInitializing = false;
        initAttempts = 0; // Reset attempt counter on success
        
        // Send ready notification to main thread
        self.postMessage({ type: 'ready', fallbackMode: false });
        
        // Configure engine with optimal settings
        engine?.postMessage('setoption name Threads value 4');
        engine?.postMessage('setoption name Hash value 128');
        engine?.postMessage('setoption name MultiPV value 1');
      }
      
      // Forward engine messages to registered handler
      if (engine && engine.onmessage) {
        engine.onmessage(message);
      }
      
      // Extract information from Stockfish output
      if (typeof message === 'string') {
        // Handle best move results
        if (message.includes('bestmove')) {
          // Clear current evaluation tracking
          if (currentEvaluation?.timeoutId) {
            clearTimeout(currentEvaluation.timeoutId);
            currentEvaluation = null;
          }
          
          const match = message.match(/bestmove\s+(\w+)/);
          if (match) {
            const bestMove = match[1];
            self.postMessage({ type: 'bestMove', move: bestMove, source: 'stockfish' });
          } else {
            self.postMessage({ 
              type: 'error', 
              message: 'Failed to extract bestmove from engine output'
            });
          }
        }
        
        // Handle evaluation info
        else if (message.includes('info depth') && message.includes('score')) {
          try {
            // Extract detailed evaluation information
            const depthMatch = message.match(/depth\s+(\d+)/);
            const scoreMatch = message.match(/score cp\s+(-?\d+)/);
            const mateMatch = message.match(/score mate\s+(-?\d+)/);
            const timeMatch = message.match(/time\s+(\d+)/);
            const nodesMatch = message.match(/nodes\s+(\d+)/);
            const pvMatch = message.match(/pv\s+(.+?)(?=$|info)/);
            
            if (depthMatch) {
              const depth = parseInt(depthMatch[1]);
              let score = 0;
              let isMate = false;
              
              if (scoreMatch) {
                score = parseInt(scoreMatch[1]) / 100; // Convert centipawns to pawns
              } else if (mateMatch) {
                score = parseInt(mateMatch[1]);
                isMate = true;
              }

              // Only send evaluation updates for completed depths or significant changes
              if (depth > 1 && !message.includes('upperbound') && !message.includes('lowerbound')) {
                const time = timeMatch ? parseInt(timeMatch[1]) : undefined;
                const nodes = nodesMatch ? parseInt(nodesMatch[1]) : undefined;
                const pv = pvMatch ? pvMatch[1].trim() : undefined;
                
                self.postMessage({ 
                  type: 'evaluation', 
                  data: { depth, score, isMate, time, nodes, pv } 
                });
              }
            }
          } catch (err) {
            console.error('Worker: Error parsing Stockfish output:', err);
          }
        }
      }
    };
    
    // Handle worker errors
    stockfishWorker.onerror = (error) => {
      console.error("Worker: Stockfish worker error:", error);
      
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      isInitializing = false;
      engine = null;
      
      // Clean up the blob URL
      URL.revokeObjectURL(stockfishWorkerUrl);
      
      // Switch to fallback mode instead of failing
      console.log('Worker: Switching to fallback mode due to worker error');
      useDirectFallback = true;
      
      // Notify main thread that we're ready in fallback mode
      self.postMessage({ 
        type: 'ready', 
        fallbackMode: true,
        message: 'Engine ready in fallback mode after worker error'
      });
    };
    
    // Initialize UCI mode
    console.log("Worker: Configuring UCI mode");
    stockfishWorker.postMessage('uci');
    
    // Wait a moment before checking if engine is ready
    setTimeout(() => {
      stockfishWorker.postMessage('isready');
    }, 1000);
    
  } catch (error) {
    console.error("Worker: Error initializing Stockfish:", error);
    isInitializing = false;
    engine = null;
    
    // Switch to fallback mode instead of failing
    console.log('Worker: Switching to fallback mode due to initialization error');
    useDirectFallback = true;
    
    // Notify main thread that we're ready in fallback mode
    self.postMessage({ 
      type: 'ready', 
      fallbackMode: true,
      message: 'Engine ready in fallback mode after initialization error'
    });
  }
}

// Helper function to fetch Stockfish from a specific URL
async function fetchStockfishFromUrl(url: string): Promise<string> {
  console.log(`Worker: Fetching Stockfish from verified URL: ${url}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for fetch
    
    const response = await fetch(url, { 
      signal: controller.signal,
      mode: url.startsWith('/') ? 'same-origin' : 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      headers: {
        'Accept': 'application/javascript',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const stockfishCode = await response.text();
    if (!stockfishCode || stockfishCode.length < 1000) {
      throw new Error('Invalid response: content too small');
    }
    
    console.log(`Worker: Successfully loaded Stockfish from ${url} (${stockfishCode.length} bytes)`);
    return stockfishCode;
    
  } catch (error) {
    console.error(`Worker: Failed to fetch from verified URL ${url}:`, error);
    throw error;
  }
}

// TypeScript requires this for web workers
export {};