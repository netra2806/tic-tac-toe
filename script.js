/**
 * Tic Tac Toe — Modern Web Application
 * Features: Local 2-Player, AI with 3 Difficulties (Easy, Smart, Minimax Unbeatable),
 * Web Audio FX synthesizer, Canvas Particle Confetti, Dynamic Strike Line, Score Persistence.
 */

(() => {
  'use strict';

  // --- Winning Combinations ---
  const WINNING_COMBOS = [
    { combo: [0, 1, 2], type: 'row', index: 0 },
    { combo: [3, 4, 5], type: 'row', index: 1 },
    { combo: [6, 7, 8], type: 'row', index: 2 },
    { combo: [0, 3, 6], type: 'col', index: 0 },
    { combo: [1, 4, 7], type: 'col', index: 1 },
    { combo: [2, 5, 8], type: 'col', index: 2 },
    { combo: [0, 4, 8], type: 'diag', index: 0 },
    { combo: [2, 4, 6], type: 'diag', index: 1 }
  ];

  // --- Game State ---
  let boardState = Array(9).fill(null);
  let currentPlayer = 'X';
  let gameMode = 'pvp'; // 'pvp' or 'pve'
  let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
  let isGameActive = true;
  let isAiThinking = false;
  let soundEnabled = true;

  const scores = {
    x: 0,
    ties: 0,
    o: 0
  };

  // --- DOM Elements ---
  const boardEl = document.getElementById('board');
  const cells = Array.from(document.querySelectorAll('.cell'));
  const strikeLineEl = document.getElementById('strike-line');
  const turnIndicatorEl = document.getElementById('turn-indicator');
  const turnSymbolEl = document.getElementById('turn-symbol');
  const turnTextEl = document.getElementById('turn-text');
  
  const scoreXEl = document.getElementById('score-x');
  const scoreTiesEl = document.getElementById('score-ties');
  const scoreOEl = document.getElementById('score-o');
  const labelXEl = document.getElementById('label-x');
  const labelOEl = document.getElementById('label-o');
  const cardXEl = document.getElementById('score-card-x');
  const cardOEl = document.getElementById('score-card-o');

  const modePvpBtn = document.getElementById('mode-pvp-btn');
  const modePveBtn = document.getElementById('mode-pve-btn');
  const aiDiffWrapper = document.getElementById('ai-difficulty-wrapper');
  const diffButtons = Array.from(document.querySelectorAll('.diff-btn'));

  const restartRoundBtn = document.getElementById('restart-round-btn');
  const resetScoresBtn = document.getElementById('reset-scores-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');

  const winnerModal = document.getElementById('winner-modal');
  const modalIconContainer = document.getElementById('modal-icon-container');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalPlayAgainBtn = document.getElementById('modal-play-again-btn');

  const confettiCanvas = document.getElementById('confetti-canvas');

  // --- Web Audio Synthesizer ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.15) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio fallback silent
    }
  }

  function playMoveSound(player) {
    if (player === 'X') {
      playTone(520, 0.12, 'triangle', 0.18);
    } else {
      playTone(380, 0.14, 'sine', 0.22);
    }
  }

  function playWinSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 chord
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          playTone(freq, 0.35, 'triangle', 0.16);
        }, idx * 90);
      });
    } catch {
      // Silent
    }
  }

  function playTieSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      playTone(350, 0.18, 'sawtooth', 0.08);
      setTimeout(() => playTone(280, 0.25, 'sawtooth', 0.08), 120);
    } catch {
      // Silent
    }
  }

  function playClickSound() {
    playTone(600, 0.05, 'sine', 0.05);
  }

  // --- SVG Mark Renderers ---
  function getXMarkSvg() {
    return `
      <svg class="cell-mark mark-x" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round">
        <line x1="10" y1="10" x2="38" y2="38" />
        <line x1="38" y1="10" x2="10" y2="38" />
      </svg>
    `;
  }

  function getOMarkSvg() {
    return `
      <svg class="cell-mark mark-o" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="6">
        <circle cx="24" cy="24" r="15" />
      </svg>
    `;
  }

  // --- Canvas Confetti Celebration ---
  let confettiParticles = [];
  let confettiAnimationId = null;

  function resizeCanvas() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti() {
    cancelAnimationFrame(confettiAnimationId);
    confettiParticles = [];
    const colors = ['#00f2fe', '#ff2a85', '#a855f7', '#fbbf24', '#38bdf8', '#f43f5e'];
    const particleCount = 90;

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
        y: window.innerHeight * 0.45 + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() * -12) - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008
      });
    }

    const ctx = confettiCanvas.getContext('2d');
    
    function animate() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let aliveCount = 0;

      for (let p of confettiParticles) {
        if (p.alpha <= 0) continue;
        aliveCount++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.2);
        ctx.restore();
      }

      if (aliveCount > 0) {
        confettiAnimationId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    animate();
  }

  // --- Storage Management ---
  function loadPersistedData() {
    try {
      const savedScores = localStorage.getItem('tictactoe_scores');
      if (savedScores) {
        const parsed = JSON.parse(savedScores);
        scores.x = Number(parsed.x) || 0;
        scores.ties = Number(parsed.ties) || 0;
        scores.o = Number(parsed.o) || 0;
      }
      const savedSound = localStorage.getItem('tictactoe_sound');
      if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
      }
    } catch {
      // LocalStorage unavailable
    }
  }

  function savePersistedData() {
    try {
      localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
      localStorage.setItem('tictactoe_sound', String(soundEnabled));
    } catch {
      // LocalStorage unavailable
    }
  }

  function updateScoreboardUI(animatedCategory = null) {
    scoreXEl.textContent = scores.x;
    scoreTiesEl.textContent = scores.ties;
    scoreOEl.textContent = scores.o;

    if (animatedCategory === 'x') {
      scoreXEl.classList.remove('bump');
      void scoreXEl.offsetWidth;
      scoreXEl.classList.add('bump');
    } else if (animatedCategory === 'ties') {
      scoreTiesEl.classList.remove('bump');
      void scoreTiesEl.offsetWidth;
      scoreTiesEl.classList.add('bump');
    } else if (animatedCategory === 'o') {
      scoreOEl.classList.remove('bump');
      void scoreOEl.offsetWidth;
      scoreOEl.classList.add('bump');
    }
  }

  function updateTurnUI() {
    boardEl.setAttribute('data-turn', currentPlayer.toLowerCase());

    if (currentPlayer === 'X') {
      turnIndicatorEl.className = 'turn-indicator turn-x';
      turnSymbolEl.textContent = '✕';
      turnTextEl.textContent = gameMode === 'pve' ? 'Your Turn' : "Player X's Turn";
      cardXEl.classList.add('active-turn');
      cardOEl.classList.remove('active-turn');
    } else {
      turnIndicatorEl.className = 'turn-indicator turn-o';
      turnSymbolEl.textContent = '○';
      turnTextEl.textContent = gameMode === 'pve' ? 'Computer is thinking...' : "Player O's Turn";
      cardOEl.classList.add('active-turn');
      cardXEl.classList.remove('active-turn');
    }
  }

  function updateModeLabels() {
    if (gameMode === 'pve') {
      labelXEl.textContent = 'You (X)';
      labelOEl.textContent = `CPU (${aiDifficulty.toUpperCase()})`;
    } else {
      labelXEl.textContent = 'Player 1';
      labelOEl.textContent = 'Player 2';
    }
  }

  // --- Dynamic Strike Line Positioning ---
  function positionStrikeLine(winInfo, winningPlayer) {
    const { type, index } = winInfo;
    strikeLineEl.className = `strike-line ${winningPlayer === 'X' ? 'x-win' : 'o-win'}`;

    if (type === 'row') {
      const topPositions = ['16.66%', '50%', '83.33%'];
      strikeLineEl.style.width = '90%';
      strikeLineEl.style.height = '6px';
      strikeLineEl.style.left = '5%';
      strikeLineEl.style.top = topPositions[index];
      strikeLineEl.style.transform = 'translateY(-50%)';
    } else if (type === 'col') {
      const leftPositions = ['16.66%', '50%', '83.33%'];
      strikeLineEl.style.width = '6px';
      strikeLineEl.style.height = '90%';
      strikeLineEl.style.top = '5%';
      strikeLineEl.style.left = leftPositions[index];
      strikeLineEl.style.transform = 'translateX(-50%)';
    } else if (type === 'diag') {
      strikeLineEl.style.width = '122%';
      strikeLineEl.style.height = '6px';
      strikeLineEl.style.top = '50%';
      strikeLineEl.style.left = '-11%';
      const angle = index === 0 ? '45deg' : '-45deg';
      strikeLineEl.style.transform = `translateY(-50%) rotate(${angle})`;
    }
    strikeLineEl.classList.remove('hidden');
  }

  function hideStrikeLine() {
    strikeLineEl.className = 'strike-line hidden';
    strikeLineEl.removeAttribute('style');
  }

  // --- Winner & Tie Evaluation ---
  function checkWinner(board) {
    for (const item of WINNING_COMBOS) {
      const [a, b, c] = item.combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], combo: item.combo, winInfo: item };
      }
    }
    if (board.every(cell => cell !== null)) {
      return { winner: 'tie' };
    }
    return null;
  }

  // --- AI Algorithms ---
  function getAvailableIndices(board) {
    const indices = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) indices.push(i);
    }
    return indices;
  }

  function getAiMove() {
    const available = getAvailableIndices(boardState);
    if (available.length === 0) return null;

    if (aiDifficulty === 'easy') {
      // 75% random, 25% smart
      if (Math.random() < 0.75) {
        return available[Math.floor(Math.random() * available.length)];
      }
    }

    if (aiDifficulty === 'medium') {
      // 1. Can AI win?
      for (const idx of available) {
        boardState[idx] = 'O';
        const win = checkWinner(boardState);
        boardState[idx] = null;
        if (win && win.winner === 'O') return idx;
      }
      // 2. Can player win? Block it!
      for (const idx of available) {
        boardState[idx] = 'X';
        const win = checkWinner(boardState);
        boardState[idx] = null;
        if (win && win.winner === 'X') return idx;
      }
      // 3. Take center if free
      if (available.includes(4)) return 4;
      // 4. Take corners
      const corners = [0, 2, 6, 8].filter(c => available.includes(c));
      if (corners.length > 0 && Math.random() < 0.8) {
        return corners[Math.floor(Math.random() * corners.length)];
      }
      // 5. Random available
      return available[Math.floor(Math.random() * available.length)];
    }

    // Hard / Unbeatable (Minimax Algorithm)
    return getMinimaxBestMove();
  }

  function getMinimaxBestMove() {
    let bestScore = -Infinity;
    let move = null;
    const available = getAvailableIndices(boardState);

    // Fast-path opening: center or random corner if fresh board
    if (available.length === 9) return 4;

    for (const index of available) {
      boardState[index] = 'O';
      const score = minimax(boardState, 0, false);
      boardState[index] = null;
      if (score > bestScore) {
        bestScore = score;
        move = index;
      }
    }
    return move !== null ? move : available[0];
  }

  function minimax(board, depth, isMaximizing) {
    const result = checkWinner(board);
    if (result) {
      if (result.winner === 'O') return 10 - depth;
      if (result.winner === 'X') return depth - 10;
      if (result.winner === 'tie') return 0;
    }

    const available = getAvailableIndices(board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const idx of available) {
        board[idx] = 'O';
        const evaluation = minimax(board, depth + 1, false);
        board[idx] = null;
        maxEval = Math.max(maxEval, evaluation);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const idx of available) {
        board[idx] = 'X';
        const evaluation = minimax(board, depth + 1, true);
        board[idx] = null;
        minEval = Math.min(minEval, evaluation);
      }
      return minEval;
    }
  }

  // --- Making a Move ---
  function makeMove(cellIndex, player) {
    if (boardState[cellIndex] !== null || !isGameActive) return false;

    boardState[cellIndex] = player;
    const cellEl = cells[cellIndex];
    cellEl.classList.add(player.toLowerCase());
    cellEl.setAttribute('aria-label', `Cell ${cellIndex + 1}, occupied by ${player}`);
    cellEl.innerHTML = player === 'X' ? getXMarkSvg() : getOMarkSvg();

    playMoveSound(player);

    const winResult = checkWinner(boardState);

    if (winResult) {
      handleGameOver(winResult);
      return true;
    }

    // Switch turns
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();

    // Trigger AI move if in PvE and it's O's turn
    if (gameMode === 'pve' && currentPlayer === 'O' && isGameActive) {
      isAiThinking = true;
      cells.forEach(c => c.classList.add('disabled'));

      // Realistic reaction delay
      const thinkDelay = aiDifficulty === 'easy' ? 350 : 450;
      setTimeout(() => {
        if (!isGameActive) return;
        const aiIndex = getAiMove();
        isAiThinking = false;
        cells.forEach(c => c.classList.remove('disabled'));
        if (aiIndex !== null) {
          makeMove(aiIndex, 'O');
        }
      }, thinkDelay);
    }

    return true;
  }

  // --- End of Game Handling ---
  function handleGameOver(result) {
    isGameActive = false;
    cardXEl.classList.remove('active-turn');
    cardOEl.classList.remove('active-turn');

    if (result.winner === 'tie') {
      scores.ties++;
      savePersistedData();
      updateScoreboardUI('ties');
      playTieSound();
      showModal({
        type: 'tie',
        title: "IT'S A DRAW!",
        subtitle: "A fiercely contested duel. No one yielded ground!",
        symbol: "🤝"
      });
      turnTextEl.textContent = "Round Ended in Draw!";
    } else {
      const winner = result.winner;
      const { combo, winInfo } = result;

      // Highlight winning cells
      combo.forEach(idx => {
        cells[idx].classList.add('winning-cell', winner === 'X' ? 'x-win' : 'o-win');
      });

      // Strike line
      positionStrikeLine(winInfo, winner);

      // Score increment
      if (winner === 'X') {
        scores.x++;
        updateScoreboardUI('x');
      } else {
        scores.o++;
        updateScoreboardUI('o');
      }
      savePersistedData();

      // Audio & Confetti
      playWinSound();
      triggerConfetti();

      // Modal message customization
      let title = `PLAYER ${winner} WINS!`;
      let subtitle = 'Masterful strategy and sharp tactical vision!';
      if (gameMode === 'pve') {
        if (winner === 'X') {
          title = 'VICTORY IS YOURS!';
          subtitle = `You completely outsmarted the ${aiDifficulty.toUpperCase()} AI!`;
        } else {
          title = 'COMPUTER WINS!';
          subtitle = 'The algorithm strikes back! Can you avenge this defeat?';
        }
      }

      showModal({
        type: winner.toLowerCase(),
        title,
        subtitle,
        symbol: winner === 'X' ? '✕' : '○'
      });

      turnTextEl.textContent = `Player ${winner} Won the Round!`;
    }
  }

  // --- Modal Dialog ---
  function showModal({ type, title, subtitle, symbol }) {
    let iconClass = 'modal-icon icon-tie';
    if (type === 'x') iconClass = 'modal-icon icon-x';
    if (type === 'o') iconClass = 'modal-icon icon-o';

    modalIconContainer.innerHTML = `
      <div class="${iconClass}">
        <span style="font-size: 2rem; font-weight: 800;">${symbol}</span>
      </div>
    `;
    modalTitle.textContent = title;
    modalSubtitle.textContent = subtitle;

    setTimeout(() => {
      winnerModal.classList.remove('hidden');
    }, 450);
  }

  function hideModal() {
    winnerModal.classList.add('hidden');
  }

  // --- Reset & New Round ---
  function resetRound() {
    boardState = Array(9).fill(null);
    isGameActive = true;
    isAiThinking = false;
    currentPlayer = 'X';

    hideModal();
    hideStrikeLine();

    cells.forEach(cell => {
      cell.className = 'cell';
      cell.innerHTML = '';
      cell.setAttribute('aria-label', `Empty cell ${Number(cell.dataset.cell) + 1}`);
    });

    updateTurnUI();
  }

  function clearAllScores() {
    scores.x = 0;
    scores.ties = 0;
    scores.o = 0;
    savePersistedData();
    updateScoreboardUI();
    resetRound();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Cell clicks
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        if (!isGameActive || isAiThinking) return;
        const index = parseInt(cell.dataset.cell, 10);
        makeMove(index, currentPlayer);
      });

      // Keyboard accessibility
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      });
    });

    // Game Mode Toggle
    modePvpBtn.addEventListener('click', () => {
      if (gameMode === 'pvp') return;
      playClickSound();
      gameMode = 'pvp';
      modePvpBtn.classList.add('active');
      modePvpBtn.setAttribute('aria-checked', 'true');
      modePveBtn.classList.remove('active');
      modePveBtn.setAttribute('aria-checked', 'false');
      aiDiffWrapper.classList.add('hidden');
      updateModeLabels();
      resetRound();
    });

    modePveBtn.addEventListener('click', () => {
      if (gameMode === 'pve') return;
      playClickSound();
      gameMode = 'pve';
      modePveBtn.classList.add('active');
      modePveBtn.setAttribute('aria-checked', 'true');
      modePvpBtn.classList.remove('active');
      modePvpBtn.setAttribute('aria-checked', 'false');
      aiDiffWrapper.classList.remove('hidden');
      updateModeLabels();
      resetRound();
    });

    // AI Difficulty Buttons
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        playClickSound();
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        aiDifficulty = btn.dataset.diff;
        updateModeLabels();
        resetRound();
      });
    });

    // Reset buttons
    restartRoundBtn.addEventListener('click', () => {
      playClickSound();
      resetRound();
    });

    resetScoresBtn.addEventListener('click', () => {
      playClickSound();
      clearAllScores();
    });

    modalPlayAgainBtn.addEventListener('click', () => {
      playClickSound();
      resetRound();
    });

    // Sound toggle
    soundToggleBtn.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      savePersistedData();
      if (soundEnabled) {
        soundIconOn.classList.remove('hidden');
        soundIconOff.classList.add('hidden');
        playTone(600, 0.08, 'sine', 0.1);
      } else {
        soundIconOn.classList.add('hidden');
        soundIconOff.classList.remove('hidden');
      }
    });

    // Key shortcut: 'R' to restart round
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        resetRound();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadPersistedData();
    if (!soundEnabled) {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
    }
    updateScoreboardUI();
    updateModeLabels();
    updateTurnUI();
    setupEventListeners();
  }

  init();
})();
