/**
 * Script de test standalone pour Stockfish 18-lite
 * Reproduit la logique du hook React sans dépendances
 *
 * Usage:
 *   const sf = new StockfishManager('/scripts/stockfish/stockfish-18-lite-single.js')
 *   await sf.init()
 *   await sf.evaluateFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
 *   console.log(sf.currentEval)
 */
import { Chess } from 'chess.js'
class StockfishManager {
  constructor(workerPath) {
    this.workerPath = workerPath
    this.worker = null
    this.ready = false
    this.searching = false
    this.crashCount = 0

    // État de l'évaluation
    this.currentEval = { depth: 0, lines: [] }
    this.lastFen = null
    this.activeSearch = null
    this.searchId = 0
    this.pendingRequest = null

    // Queue de commandes UCI
    this.commandQueue = []
    this.globalStream = null

    // Configuration
    this.config = {
      maxDepth: 25,
      multipv: 3,
      threads: 1,
      hash: 16
    }
  }

  // Utilitaires pour analyser les commandes UCI
  getFirstWord(line) {
    const spaceIndex = line.indexOf(' ')
    return spaceIndex === -1 ? line : line.substring(0, spaceIndex)
  }

  determineCommandType(line) {
    const firstWord = this.getFirstWord(line)

    if (firstWord === 'uciok' || firstWord === 'option') {
      return 'uci'
    } else if (firstWord === 'readyok') {
      return 'isready'
    } else if (firstWord === 'bestmove' || firstWord === 'info') {
      return 'go'
    }
    return 'other'
  }

  findQueueIndex(line, queue) {
    if (!queue.length) return -1

    if (queue[0].cmd === 'bench' || queue[0].cmd === 'perft') {
      return 0
    }

    const cmdType = this.determineCommandType(line)

    for (let i = 0; i < queue.length; i++) {
      const queueCmdFirstWord = this.getFirstWord(queue[i].cmd)
      if (queueCmdFirstWord === cmdType ||
          (cmdType === 'other' && (queueCmdFirstWord === 'd' || queueCmdFirstWord === 'eval'))) {
        return i
      }
    }

    return 0
  }

  // Envoyer une commande UCI
  send(cmd, cb, stream) {
    if (!this.worker) return

    const trimmedCmd = cmd.trim()

    const noReplyCommands = ['ucinewgame', 'flip', 'stop', 'ponderhit']
    const isNoReply = noReplyCommands.includes(trimmedCmd) ||
      trimmedCmd.startsWith('position') ||
      trimmedCmd.startsWith('setoption')

    if (!isNoReply) {
      this.commandQueue.push({
        cmd: trimmedCmd,
        cb,
        stream
      })
    }

    this.worker.postMessage(trimmedCmd)

    if (isNoReply && cb) {
      setTimeout(cb, 0)
    }
  }

  // Traiter les messages du worker
  processWorkerMessage(line) {
    if (line.includes('\n')) {
      line.split('\n').forEach(l => l && this.processWorkerMessage(l))
      return
    }

    if (this.globalStream) {
      this.globalStream(line)
    }

    if (!this.commandQueue.length ||
        line.startsWith('No such option') ||
        line.startsWith('id ') ||
        line.startsWith('Stockfish')) {
      return
    }

    const queueIndex = this.findQueueIndex(line, this.commandQueue)
    if (queueIndex === -1) return

    const queueItem = this.commandQueue[queueIndex]
    if (!queueItem) return

    if (queueItem.stream) {
      queueItem.stream(line)
    }

    if (typeof queueItem.message === 'undefined') {
      queueItem.message = ''
    } else if (queueItem.message !== '') {
      queueItem.message += '\n'
    }
    queueItem.message += line

    let done = false
    const firstWord = this.getFirstWord(line)

    if (line === 'uciok') {
      done = true
      this.ready = true
    } else if (line === 'readyok') {
      done = true
    } else if (firstWord === 'bestmove' && queueItem.cmd !== 'bench') {
      done = true
      queueItem.message = line
      this.searching = false
      console.log('🔄 Clearing activeSearchRef and scheduling next search')
      setTimeout(() => {
        this.activeSearch = null
        this.scheduleSearch()
      }, 10)
    } else if (queueItem.cmd === 'd' && line.startsWith('Legal uci moves')) {
      done = true
    } else if (queueItem.cmd === 'eval' && /Total Evaluation[\s\S]+\n$/.test(queueItem.message)) {
      done = true
    } else if (line.startsWith('Nodes/second')) {
      done = true
    } else if (line.startsWith('Unknown command')) {
      done = true
    }

    if (done) {
      this.commandQueue.splice(queueIndex, 1)
      if (queueItem.cb && !queueItem.discard) {
        queueItem.cb(queueItem.message)
      }
    }
  }

  // Planifier une recherche
  scheduleSearch() {
    if (!this.worker || !this.ready) return
    if (this.searching) return

    const request = this.pendingRequest
    if (!request) return

    this.pendingRequest = null
    this.searchId += 1
    const searchId = this.searchId

    this.activeSearch = { id: searchId, fen: request.fen }
    this.searching = true
    this.lastFen = request.fen
    this.currentEval = { depth: 0, lines: [] }
    console.log('📤 Sending UCI commands to start search')

    this.send('ucinewgame')
    this.send(`position fen ${request.fen}`)
    this.send(`setoption name MultiPV value ${request.multipv}`)
    this.send(request.goCommand)
  }

  // Initialiser le worker
  init() {
    return new Promise((resolve, reject) => {
      this.worker = new Worker(this.workerPath)

      this.worker.onmessage = (e) => {
        const line = e.data

        // Parser les lignes "info depth"
        if (line.startsWith('info depth')) {
          if (!this.activeSearch || !this.lastFen) return

          const tokens = line.split(' ')
          const depthIdx = tokens.indexOf('depth')
          const multipvIdx = tokens.indexOf('multipv')
          const scoreIdx = tokens.indexOf('score')
          const pvIdx = tokens.indexOf('pv')

          if (depthIdx === -1 || scoreIdx === -1 || pvIdx === -1 || multipvIdx === -1) return

          const depth = parseInt(tokens[depthIdx + 1])
          const multipv = parseInt(tokens[multipvIdx + 1])
          const type = tokens[scoreIdx + 1]
          const val = parseInt(tokens[scoreIdx + 2])
          const linePv = tokens.slice(pvIdx + 1)

          const score = type === 'cp' ? val : null
          const mate = type === 'mate' ? val : null
          const bestmove = tokens[pvIdx + 1]
          const isCutoff = line.includes('lowerbound') || line.includes('upperbound')

          const lineEval = {
            score,
            mate,
            bestmove,
            line: linePv,
            cutoff: isCutoff
          }


          // Log première ligne reçue
          if (this.currentEval.depth === 0) {
            console.log(`✅ First eval line received at depth ${depth}`)
          }

          this.currentEval.depth = depth
          this.currentEval.lines[multipv - 1] = lineEval

          if (depth >= this.config.maxDepth) {
            console.log(`🛑 Max depth ${this.config.maxDepth} reached, stopping`)
            this.send('stop')
          }
        }

        // Timeout pour initialisation
        if (line === "uciok") {
          setTimeout(() => {
            if (this.ready) return
            this.crashCount += 1
            this.worker.terminate()
            this.worker = null
            if (this.crashCount >= 10) {
              console.error('Stockfish timeout 10x, stopping')
              reject(new Error('Stockfish init timeout'))
              return
            }
            if (this.lastFen) {
              this.evaluateFen(this.lastFen)
            }
          }, 250)
        }

        if (line === 'readyok') {
          this.crashCount = 0
          resolve()
        }

        this.processWorkerMessage(line)
      }

      this.worker.onerror = () => {
        this.handleCrash()
        reject(new Error('Worker error'))
      }

      this.worker.onmessageerror = () => {
        this.handleCrash()
        reject(new Error('Worker message error'))
      }

      this.ready = false

      this.send('uci', () => {
        this.send('isready')
      })

      this.send(`setoption name Threads value ${this.config.threads}`)
      this.send(`setoption name Hash value ${this.config.hash}`)
    })
  }

  // Évaluer une position FEN
  async evaluateFen(fen, multipv = 3, infinite = true) {
    if (!this.worker) {
      await this.init()
    }

    this.pendingRequest = {
      fen,
      multipv,
      goCommand: infinite ? 'go infinite' : 'go depth 20'
    }

    if (this.searching) {
      this.send('stop')
    } else {
      this.scheduleSearch()
    }

    // Mesurer le temps de démarrage
    const startTime = Date.now()

    // Attendre que l'évaluation démarre
    let waited = 0
    const maxWait = 2000
    while (this.currentEval.depth === 0 && waited < maxWait) {
      await new Promise(res => setTimeout(res, 10))
      waited += 10
    }

    const evalStartTime = Date.now() - startTime
    console.log(`⏱️ Eval started after ${evalStartTime}ms, depth ${this.currentEval.depth}`)

    if (this.currentEval.depth === 0) {
      throw new Error('No eval received after init')
    }
  }

  // Arrêter la recherche en cours
  stop() {
    this.send('stop')
  }

  // Gérer les crashes
  handleCrash() {
    this.crashCount += 1
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    this.searching = false
    this.activeSearch = null
    this.commandQueue = []

    if (this.crashCount >= 10) {
      console.error('Stockfish crashed 10x consecutively')
      return
    }

    if (this.lastFen) {
      this.evaluateFen(this.lastFen)
    }
  }

  // Arrêter complètement
  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.ready = false
      this.searching = false
      this.activeSearch = null
      this.pendingRequest = null
      this.commandQueue = []
    }
  }

  // Activer un stream debug
  setDebugStream(fn) {
    this.globalStream = fn
  }
}

// ============ EXEMPLE D'UTILISATION ============

async function example() {
  console.log('🚀 Initializing Stockfish...')

  // Créer l'instance
  const sf = new StockfishManager('stockfish-18-lite.js')

  // Activer le debug (optionnel)
  sf.setDebugStream((line) => {
    if (line.startsWith('info depth')) {
      console.log('📊', line)
    }
  })

  try {
    // Initialiser
    await sf.init()
    console.log('✅ Stockfish ready!')

    // Évaluer la position de départ
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    await sf.evaluateFen(startFen, 3, false) // 3 lignes, depth 20

    // Attendre l'évaluation complète
    await new Promise(res => setTimeout(res, 2000))

    // Afficher les résultats
    console.log('\n📈 Evaluation:')
    console.log('Depth:', sf.currentEval.depth)
    sf.currentEval.lines.forEach((line, i) => {
      if (!line) return
      const scoreStr = line.mate !== null
        ? `M${line.mate}`
        : `${(line.score / 100).toFixed(2)}`
      console.log(`Line ${i+1}: ${scoreStr} - ${line.bestmove} ${line.line.slice(0, 5).join(' ')}`)
    })

    // Tester une autre position
    const tacticalFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
    console.log('\n🎯 Testing tactical position...')
    await sf.evaluateFen(tacticalFen, 1, false)

    await new Promise(res => setTimeout(res, 2000))

    console.log('\n📈 Evaluation:')
    console.log('Depth:', sf.currentEval.depth)
    const topLine = sf.currentEval.lines[0]
    if (topLine) {
      const scoreStr = topLine.mate !== null
        ? `Mate in ${topLine.mate}`
        : `Score: ${(topLine.score / 100).toFixed(2)}`
      console.log(scoreStr)
      console.log('Best move:', topLine.bestmove)
      console.log('Line:', topLine.line.slice(0, 8).join(' '))
    }

  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    // Nettoyer
    sf.destroy()
    console.log('\n🧹 Cleanup done')
  }
}

// Décommenter pour exécuter l'exemple (en environnement browser avec worker disponible)
// example()

// Export pour usage ES6 module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StockfishManager
}

export default StockfishManager
