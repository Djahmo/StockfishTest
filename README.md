# Stockfish 17 vs 18 Lite - Performance Benchmark

Automated benchmark comparing initialization and evaluation performance between Stockfish 17-lite and Stockfish 18-lite in browser environment (WebAssembly).

## 🔴 Identified Issue

**Stockfish 18-lite is significantly slower than version 17-lite**:

```
📊 FINAL STATISTICS (20 iterations)
================================================================================

🔧 INIT TIMES:
  SF17: min=176ms | max=365ms | avg=209ms
  SF18: min=559ms | max=607ms | avg=579ms
  Diff: +371ms avg (+177.5%)

⚡ EVAL TIMES:
  SF17: min=379ms | max=427ms | avg=393ms
  SF18: min=579ms | max=622ms | avg=605ms
  Diff: +213ms avg (+54.1%)

⏱️  TOTAL TIMES:
  SF17: min=560ms | max=744ms | avg=601ms
  SF18: min=1154ms | max=1215ms | avg=1185ms
  Diff: +583ms avg (+96.9%)
```

### Summary
- **Initialization**: 2.8x slower (+177%)
- **Evaluation**: 1.5x slower (+54%)
- **Total**: 2x slower (+97%)

## 🚀 Installation & Usage

### Prerequisites
- Node.js (for npm)
- Modern browser with WebAssembly support

### Setup
```bash
npm install
npm run dev
```

Open https://localhost:3030

### Usage
1. Click **"▶️ Start Benchmark"**
2. Wait for 20 iterations to complete
3. Final statistics are displayed automatically

## 📁 Structure

- `stockfish-test-script.js` - Standalone StockfishManager class with full UCI protocol management
- `benchmark.js` - Automated benchmark script
- `index.html` - User interface
- `stockfish-17-lite.js` / `stockfish-18-lite.js` - Stockfish workers to compare

## 🔧 Features

### StockfishManager
Standalone JavaScript class to interact with Stockfish via Web Workers:

- ✅ Full UCI protocol management
- ✅ Advanced command queue
- ✅ Parsing of `info depth` messages
- ✅ Detailed timing logs
- ✅ Crash and timeout handling
- ✅ MultiPV support

### Benchmark
- 20 automatic iterations
- Full worker reset at each iteration
- Precise measurements (init, eval, total)
- Min/max/average statistics
- Calculation of absolute and percentage differences

## 📊 Configuration

Default values:
- **Position**: Starting chess position
- **Depth**: 20
- **Iterations**: 20

Configurable via the interface.

## 🐛 Technical Details

### Initialization Time
Init time measures:
1. Worker creation
2. `uci` command
3. Reception of `uciok`
4. `isready` command
5. Reception of `readyok`

### Evaluation Time
Evaluation time measures:
1. Sending UCI commands (`position`, `setoption`, `go`)
2. Reception of first `info depth` line
3. Analysis until configured depth is reached
4. `stop` command

## 💻 Test Environment

- Browser: Chrome/Firefox
- OS: Windows/Linux/macOS
- COOP/COEP headers configured (required for SharedArrayBuffer)

## 📝 Notes

- Compatible with all Stockfish engines compiled to WebAssembly
- Workers must be accessible at the same level as index.html

## 🤝 Contribution

Issue reported to document the performance difference between SF17-lite and SF18-lite.

If you have insights on the origin of the problem or optimization suggestions, feel free to comment.

## 📜 License

MIT - Free to use and modify
