# Stockfish 17 vs 18 Lite - Performance Benchmark

Benchmark automatisé comparant les performances d'initialisation et d'évaluation entre Stockfish 17-lite et Stockfish 18-lite en environnement navigateur (WebAssembly).

## 🔴 Problème identifié

**Stockfish 18-lite est significativement plus lent que la version 17-lite** :

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

### Résumé
- **Initialisation** : 2.8x plus lente (+177%)
- **Évaluation** : 1.5x plus lente (+54%)
- **Total** : 2x plus lent (+97%)

## 🚀 Installation & Utilisation

### Prérequis
- Node.js (pour npm)
- Navigateur moderne compatible WebAssembly

### Setup
```bash
npm install
npm run dev
```

Ouvrir http://localhost:3030

### Utilisation
1. Cliquer sur **"▶️ Start Benchmark"**
2. Attendre la fin des 20 itérations
3. Les statistiques finales s'affichent automatiquement

## 📁 Structure

- `stockfish-test-script.js` - Classe StockfishManager standalone avec gestion complète du protocole UCI
- `benchmark.js` - Script de benchmark automatisé
- `index.html` - Interface utilisateur
- `stockfish-17-lite.js` / `stockfish-18-lite.js` - Workers Stockfish à comparer

## 🔧 Fonctionnalités

### StockfishManager
Classe JavaScript standalone pour interagir avec Stockfish via Web Workers :

- ✅ Gestion complète du protocole UCI
- ✅ Queue de commandes avancée
- ✅ Parsing des messages `info depth`
- ✅ Logs de timing détaillés
- ✅ Gestion des crashes et timeouts
- ✅ Support MultiPV

### Benchmark
- 20 itérations automatiques
- Réinitialisation complète du worker à chaque itération
- Mesures précises (init, eval, total)
- Statistiques min/max/moyenne
- Calcul des différences absolues et en pourcentage

## 📊 Configuration

Par défaut :
- **Position** : Position de départ des échecs
- **Depth** : 20
- **Iterations** : 20

Modifiable via l'interface.

## 🐛 Détails techniques

### Temps d'initialisation
Le temps d'init mesure :
1. Création du Worker
2. Commande `uci`
3. Réception de `uciok` 
4. Commande `isready`
5. Réception de `readyok`

### Temps d'évaluation  
Le temps d'évaluation mesure :
1. Envoi des commandes UCI (`position`, `setoption`, `go`)
2. Réception de la première ligne `info depth`
3. Analyse jusqu'à atteindre la profondeur configurée
4. Commande `stop`

## 💻 Environnement de test

- Browser: Chrome/Firefox
- OS: Windows/Linux/macOS
- Headers COOP/COEP configurés (requis pour SharedArrayBuffer)

## 📝 Notes

- Le script utilise `chess.js` uniquement pour la conversion UCI→SAN (optionnel)
- Compatible avec tous les moteurs Stockfish compilés en WebAssembly
- Les workers doivent être accessibles au même niveau que index.html

## 🤝 Contribution

Issue reportée pour documenter la différence de performance entre SF17-lite et SF18-lite.

Si vous avez des insights sur l'origine du problème ou des suggestions d'optimisation, n'hésitez pas à commenter.

## 📜 License

MIT - Free to use and modify
