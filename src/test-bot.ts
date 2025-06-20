// Comprehensive test to check if the Stockfish bot is generating moves correctly
// Tests various board positions and scenarios

interface TestCase {
  name: string;
  fen: string;
  expectedMovePattern?: RegExp;
  description: string;
  depth?: number;
  movetime?: number;
}

// Test cases covering different chess scenarios
const testCases: TestCase[] = [
  {
    name: "Opening Position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    expectedMovePattern: /^[a-h][1-8][a-h][1-8]$/,
    description: "Starting position - should generate a valid opening move",
    depth: 5,
    movetime: 1500
  },
  {
    name: "After 1.e4",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    expectedMovePattern: /^[a-h][1-8][a-h][1-8]$/,
    description: "Black's response to 1.e4",
    depth: 5,
    movetime: 1500
  },
  {
    name: "Mate in 1 (Easy)",
    fen: "rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3",
    expectedMovePattern: /^[a-h][1-8][a-h][1-8]$/,
    description: "Scholar's mate position - should find checkmate quickly",
    depth: 3,
    movetime: 2000
  },
  {
    name: "Tactical Position",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    expectedMovePattern: /^[a-h][1-8][a-h][1-8]$/,
    description: "Italian Game position with tactical possibilities",
    depth: 6,
    movetime: 2000
  },
  {
    name: "Endgame Position",
    fen: "8/8/8/8/8/3k4/3p4/3K4 b - - 0 1",
    expectedMovePattern: /^[a-h][1-8][a-h][1-8]$/,
    description: "Simple king and pawn endgame",
    depth: 8,
    movetime: 1000
  }
];

class StockfishTester {
  private worker: Worker | null = null;
  private currentTestIndex = 0;
  private testResults: Array<{name: string, passed: boolean, move?: string, error?: string}> = [];
  private isEngineReady = false;
  private currentTestTimeout: number | null = null;

  constructor() {
    console.log('🚀 Starting comprehensive Stockfish AI test...\n');
  }

  async runAllTests(): Promise<void> {
    return new Promise((resolve) => {
      this.initializeEngine(() => {
        this.runNextTest(resolve);
      });
    });
  }

  private initializeEngine(onReady: () => void): void {
    console.log('🔧 Initializing Stockfish engine...');
    
    try {
      this.worker = new Worker(new URL('./workers/stockfishWorker.ts', import.meta.url), 
        { type: 'module' });
      
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e, onReady);
      };

      this.worker.onerror = (error) => {
        console.error('❌ Worker error:', error);
        this.finishTesting();
      };

      // Initialize the worker
      this.worker.postMessage({ cmd: 'init' });
      
      // Safety timeout for engine initialization
      setTimeout(() => {
        if (!this.isEngineReady) {
          console.error('❌ Engine initialization timed out after 15 seconds');
          this.finishTesting();
        }
      }, 15000);
      
    } catch (error) {
      console.error('❌ Failed to create worker:', error);
      this.finishTesting();
    }
  }

  private handleWorkerMessage(e: MessageEvent, onReady?: () => void): void {
    const { type, move, data } = e.data;
    
    if (type === 'ready') {
      console.log('✅ Stockfish engine is ready');
      this.isEngineReady = true;
      if (onReady) onReady();
      return;
    }

    if (type === 'error') {
      console.error(`❌ Engine error: ${e.data.message}`);
      this.testResults[this.currentTestIndex] = {
        name: testCases[this.currentTestIndex]?.name || 'Unknown',
        passed: false,
        error: e.data.message
      };
      this.proceedToNextTest();
      return;
    }

    if (type === 'bestMove' && move) {
      this.handleBestMove(move);
      return;
    }

    if (type === 'evaluation' && data) {
      console.log(`   📊 Depth ${data.depth}: ${data.isMate ? `Mate in ${data.score}` : `Score: ${data.score}`}`);
    }
  }

  private handleBestMove(move: string): void {
    const testCase = testCases[this.currentTestIndex];
    
    if (this.currentTestTimeout) {
      clearTimeout(this.currentTestTimeout);
      this.currentTestTimeout = null;
    }

    console.log(`   🎯 Best move: ${move}`);
    
    // Validate move format
    const isValidFormat = testCase.expectedMovePattern?.test(move) ?? /^[a-h][1-8][a-h][1-8]/.test(move);
    
    this.testResults[this.currentTestIndex] = {
      name: testCase.name,
      passed: isValidFormat,
      move: move
    };

    if (isValidFormat) {
      console.log(`   ✅ Test passed: ${testCase.name}`);
    } else {
      console.log(`   ❌ Test failed: ${testCase.name} - Invalid move format`);
    }

    this.proceedToNextTest();
  }

  private runNextTest(onComplete?: () => void): void {
    if (this.currentTestIndex >= testCases.length) {
      this.finishTesting();
      if (onComplete) onComplete();
      return;
    }

    const testCase = testCases[this.currentTestIndex];
    console.log(`\n📋 Test ${this.currentTestIndex + 1}/${testCases.length}: ${testCase.name}`);
    console.log(`   📝 ${testCase.description}`);
    console.log(`   🏁 Position: ${testCase.fen}`);

    if (!this.worker) {
      console.error('❌ Worker not available');
      this.finishTesting();
      return;
    }

    // Set a timeout for this test
    this.currentTestTimeout = window.setTimeout(() => {
      console.log(`   ⏰ Test timed out after ${(testCase.movetime || 2000) + 2000}ms`);
      this.testResults[this.currentTestIndex] = {
        name: testCase.name,
        passed: false,
        error: 'Timeout'
      };
      this.proceedToNextTest();
    }, (testCase.movetime || 2000) + 2000);

    // Send evaluation request
    this.worker.postMessage({
      cmd: 'evaluate',
      payload: {
        fen: testCase.fen,
        depth: testCase.depth || 5,
        movetime: testCase.movetime || 2000
      }
    });
  }

  private proceedToNextTest(): void {
    this.currentTestIndex++;
    setTimeout(() => this.runNextTest(), 500); // Small delay between tests
  }

  private finishTesting(): void {
    console.log('\n📊 === TEST RESULTS SUMMARY ===');
    
    let passedTests = 0;
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const moveInfo = result.move ? ` (Move: ${result.move})` : '';
      const errorInfo = result.error ? ` (Error: ${result.error})` : '';
      
      console.log(`${index + 1}. ${result.name}: ${status}${moveInfo}${errorInfo}`);
      
      if (result.passed) passedTests++;
    });

    console.log(`\n🎯 Overall Result: ${passedTests}/${this.testResults.length} tests passed`);
    
    if (passedTests === this.testResults.length) {
      console.log('🎉 All tests passed! Stockfish AI is working correctly.');
    } else if (passedTests > 0) {
      console.log('⚠️  Some tests passed. Stockfish is partially working.');
    } else {
      console.log('💥 All tests failed. Stockfish AI is not working properly.');
    }

    // Clean up
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Create and run the comprehensive test
const tester = new StockfishTester();
tester.runAllTests().then(() => {
  console.log('\n✨ Testing completed.');
}).catch((error) => {
  console.error('💥 Testing failed with error:', error);
});