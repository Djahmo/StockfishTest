import StockfishManager from '/stockfish-test-script.js'

const output = document.getElementById('output')
const output17 = document.getElementById('output17')
const output18 = document.getElementById('output18')
const btnStart = document.getElementById('btnStart')
const btnStop = document.getElementById('btnStop')
const btnClear = document.getElementById('btnClear')
const iterationsEl = document.getElementById('iterations')

let running = false
let iterations = 0
const MAX_ITERATIONS = 20

// Stats tracking
const stats = {
  init17: [],
  init18: [],
  eval17: [],
  eval18: [],
  total17: [],
  total18: []
}

const log = (msg, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
  output.innerHTML += `<span class="${className}">[${timestamp}] ${msg}</span>\n`
  output.scrollTop = output.scrollHeight
}

const logEngine = (engineOutput, msg, type = 'info') => {
  const className = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'eval' ? 'eval' : 'info'
  engineOutput.innerHTML += `<span class="${className}">${msg}</span>\n`
  engineOutput.scrollTop = engineOutput.scrollHeight
}

const runBenchmarkIteration = async () => {
  const fen = document.getElementById('fen').value
  const depth = parseInt(document.getElementById('depth').value)
  
  iterations++
  iterationsEl.textContent = `${iterations}/${MAX_ITERATIONS}`
  
  log(`\n🔄 Iteration ${iterations}`, 'success')
  
  // Benchmark SF17
  const start17 = performance.now()
  const startInit17 = performance.now()
  const sf17 = new StockfishManager('stockfish-17-lite.js')
  await sf17.init()
  const initTime17 = performance.now() - startInit17
  
  sf17.config.maxDepth = depth
  const startEval17 = performance.now()
  await sf17.evaluateFen(fen, 1, false)
  
  // Attendre depth
  while (sf17.currentEval.depth < depth) {
    await new Promise(res => setTimeout(res, 50))
  }
  const evalTime17 = performance.now() - startEval17
  const total17 = performance.now() - start17
  
  logEngine(output17, `⏱️ Init: ${initTime17.toFixed(0)}ms | Eval: ${evalTime17.toFixed(0)}ms | Total: ${total17.toFixed(0)}ms`, 'eval')
  
  sf17.destroy()
  
  // Benchmark SF18
  const start18 = performance.now()
  const startInit18 = performance.now()
  const sf18 = new StockfishManager('stockfish-18-lite.js')
  await sf18.init()
  const initTime18 = performance.now() - startInit18
  
  sf18.config.maxDepth = depth
  const startEval18 = performance.now()
  await sf18.evaluateFen(fen, 1, false)
  
  // Attendre depth
  while (sf18.currentEval.depth < depth) {
    await new Promise(res => setTimeout(res, 50))
  }
  const evalTime18 = performance.now() - startEval18
  const total18 = performance.now() - start18
  
  logEngine(output18, `⏱️ Init: ${initTime18.toFixed(0)}ms | Eval: ${evalTime18.toFixed(0)}ms | Total: ${total18.toFixed(0)}ms`, 'eval')
  
  sf18.destroy()
  
  // Sauvegarder stats
  stats.init17.push(initTime17)
  stats.init18.push(initTime18)
  stats.eval17.push(evalTime17)
  stats.eval18.push(evalTime18)
  stats.total17.push(total17)
  stats.total18.push(total18)
  
  // Log comparaison
  const diffInit = initTime18 - initTime17
  const diffEval = evalTime18 - evalTime17
  const diffTotal = total18 - total17
  log(`📊 SF18 vs SF17: Init ${diffInit > 0 ? '+' : ''}${diffInit.toFixed(0)}ms | Eval ${diffEval > 0 ? '+' : ''}${diffEval.toFixed(0)}ms | Total ${diffTotal > 0 ? '+' : ''}${diffTotal.toFixed(0)}ms`)
  
  // Vérifier si on continue
  if (iterations >= MAX_ITERATIONS) {
    running = false
    btnStart.disabled = false
    btnStop.disabled = true
    showFinalStats()
  } else if (running) {
    setTimeout(runBenchmarkIteration, 100)
  }
}

const showFinalStats = () => {
  const calcStats = (arr) => ({
    min: Math.min(...arr),
    max: Math.max(...arr),
    avg: arr.reduce((a, b) => a + b, 0) / arr.length
  })
  
  log('\n' + '='.repeat(80), 'success')
  log('📊 FINAL STATISTICS (20 iterations)', 'success')
  log('='.repeat(80), 'success')
  
  const init17Stats = calcStats(stats.init17)
  const init18Stats = calcStats(stats.init18)
  const eval17Stats = calcStats(stats.eval17)
  const eval18Stats = calcStats(stats.eval18)
  const total17Stats = calcStats(stats.total17)
  const total18Stats = calcStats(stats.total18)
  
  log('\n🔧 INIT TIMES:', 'info')
  log(`  SF17: min=${init17Stats.min.toFixed(0)}ms | max=${init17Stats.max.toFixed(0)}ms | avg=${init17Stats.avg.toFixed(0)}ms`)
  log(`  SF18: min=${init18Stats.min.toFixed(0)}ms | max=${init18Stats.max.toFixed(0)}ms | avg=${init18Stats.avg.toFixed(0)}ms`)
  log(`  Diff: ${(init18Stats.avg - init17Stats.avg > 0 ? '+' : '')}${(init18Stats.avg - init17Stats.avg).toFixed(0)}ms avg (${((init18Stats.avg / init17Stats.avg - 1) * 100).toFixed(1)}%)`, 'eval')
  
  log('\n⚡ EVAL TIMES:', 'info')
  log(`  SF17: min=${eval17Stats.min.toFixed(0)}ms | max=${eval17Stats.max.toFixed(0)}ms | avg=${eval17Stats.avg.toFixed(0)}ms`)
  log(`  SF18: min=${eval18Stats.min.toFixed(0)}ms | max=${eval18Stats.max.toFixed(0)}ms | avg=${eval18Stats.avg.toFixed(0)}ms`)
  log(`  Diff: ${(eval18Stats.avg - eval17Stats.avg > 0 ? '+' : '')}${(eval18Stats.avg - eval17Stats.avg).toFixed(0)}ms avg (${((eval18Stats.avg / eval17Stats.avg - 1) * 100).toFixed(1)}%)`, 'eval')
  
  log('\n⏱️  TOTAL TIMES:', 'info')
  log(`  SF17: min=${total17Stats.min.toFixed(0)}ms | max=${total17Stats.max.toFixed(0)}ms | avg=${total17Stats.avg.toFixed(0)}ms`)
  log(`  SF18: min=${total18Stats.min.toFixed(0)}ms | max=${total18Stats.max.toFixed(0)}ms | avg=${total18Stats.avg.toFixed(0)}ms`)
  log(`  Diff: ${(total18Stats.avg - total17Stats.avg > 0 ? '+' : '')}${(total18Stats.avg - total17Stats.avg).toFixed(0)}ms avg (${((total18Stats.avg / total17Stats.avg - 1) * 100).toFixed(1)}%)`, 'eval')
  
  log('\n' + '='.repeat(80) + '\n', 'success')
}

btnStart.addEventListener('click', async () => {
  running = true
  btnStart.disabled = true
  btnStop.disabled = false
  
  log('🚀 Starting continuous benchmark...', 'success')
  runBenchmarkIteration()
})

btnStop.addEventListener('click', () => {
  running = false
  btnStart.disabled = false
  btnStop.disabled = true
  log('⏸️ Benchmark stopped', 'info')
})

btnClear.addEventListener('click', () => {
  output.innerHTML = ''
  output17.innerHTML = ''
  output18.innerHTML = ''
  iterations = 0
  iterationsEl.textContent = '0/20'
  
  // Reset stats
  stats.init17 = []
  stats.init18 = []
  stats.eval17 = []
  stats.eval18 = []
  stats.total17 = []
  stats.total18 = []
})

log('💡 Click "Start Benchmark" to run 20 iterations and compare SF17 vs SF18', 'info')
