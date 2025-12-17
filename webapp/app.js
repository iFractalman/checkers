// Checkers with multiplayer support via backend API

const BOARD_SIZE = 8;
const Piece = {
  EMPTY: 0,
  RED: 1,
  RED_KING: 2,
  BLACK: 3,
  BLACK_KING: 4,
};

// Multiplayer state
let roomId = null;
let userId = null;
let playerColor = null;
let isMultiplayer = false;
let pollInterval = null;

let board = [];
let currentPlayer = Piece.RED;
let gameOver = false;
let winner = null;

let selectedSquare = null;
let dragState = null;

const boardEl = document.getElementById('board');
const turnIndicatorEl = document.getElementById('turn-indicator');
const newGameBtn = document.getElementById('new-game-btn');

// Get URL params (from Telegram WebApp)
const urlParams = new URLSearchParams(window.location.search);
roomId = urlParams.get('room');
userId = urlParams.get('user') ? parseInt(urlParams.get('user')) : null;

if (roomId && userId) {
  isMultiplayer = true;
  loadGameState();
  // Poll for updates every 2 seconds
  pollInterval = setInterval(loadGameState, 2000);
} else {
  // Single player mode
  createInitialBoard();
  renderBoard();
}

async function loadGameState() {
  if (!roomId || !userId) return;
  
  try {
    const response = await fetch(`/api/room/${roomId}?user_id=${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        turnIndicatorEl.textContent = 'Game not found';
        if (pollInterval) clearInterval(pollInterval);
        return;
      }
      throw new Error('Failed to load game');
    }
    
    const data = await response.json();
    playerColor = data.player_color;
    
    // Convert backend board format to local format
    board = data.board.map(row => 
      row.map(cell => {
        if (!cell) return Piece.EMPTY;
        if (cell === 'red') return Piece.RED;
        if (cell === 'red_king') return Piece.RED_KING;
        if (cell === 'black') return Piece.BLACK;
        if (cell === 'black_king') return Piece.BLACK_KING;
        return Piece.EMPTY;
      })
    );
    
    currentPlayer = data.current_player === 'red' ? Piece.RED : Piece.BLACK;
    gameOver = data.game_over;
    winner = data.winner === 'red' ? Piece.RED : (data.winner === 'black' ? Piece.BLACK : null);
    
    updateTurnIndicator();
    renderBoard();
    
    if (gameOver && pollInterval) {
      clearInterval(pollInterval);
    }
  } catch (error) {
    console.error('Error loading game state:', error);
  }
}

async function sendMove(fromRow, fromCol, toRow, toCol) {
  if (!roomId || !userId) return false;
  
  try {
    const response = await fetch(`/api/room/${roomId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
        from_row: fromRow,
        from_col: fromCol,
        to_row: toRow,
        to_col: toCol,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(error.detail || 'Invalid move');
      return false;
    }
    
    // Reload state after move
    await loadGameState();
    return true;
  } catch (error) {
    console.error('Error making move:', error);
    alert('Failed to make move');
    return false;
  }
}

function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}

function createInitialBoard() {
  board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => Piece.EMPTY),
  );

  // Black pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isDarkSquare(row, col)) {
        board[row][col] = Piece.BLACK;
      }
    }
  }

  // Red pieces (bottom)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isDarkSquare(row, col)) {
        board[row][col] = Piece.RED;
      }
    }
  }

  currentPlayer = Piece.RED;
  gameOver = false;
  winner = null;
  selectedSquare = null;
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.dataset.row = row;
      square.dataset.col = col;

      square.classList.add(isDarkSquare(row, col) ? 'dark' : 'light');

      if (
        selectedSquare &&
        selectedSquare.row === row &&
        selectedSquare.col === col
      ) {
        square.classList.add('selected');
      }

      const piece = board[row][col];
      if (piece !== Piece.EMPTY) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('piece');
        pieceEl.dataset.row = row;
        pieceEl.dataset.col = col;

        const isRed = piece === Piece.RED || piece === Piece.RED_KING;
        const isKing = piece === Piece.RED_KING || piece === Piece.BLACK_KING;

        pieceEl.classList.add(isRed ? 'red' : 'black');
        if (isKing) {
          pieceEl.classList.add('king');
        }

        square.appendChild(pieceEl);
      }

      boardEl.appendChild(square);
    }
  }

  updateTurnIndicator();
  attachSquareListeners();
  attachPieceDragListeners();
}

function updateTurnIndicator() {
  if (gameOver) {
    const text =
      winner === Piece.RED
        ? 'Game over – Red wins'
        : winner === Piece.BLACK
        ? 'Game over – Black wins'
        : 'Game over';
    turnIndicatorEl.textContent = text;
    return;
  }

  if (isMultiplayer && playerColor) {
    const isMyTurn = (playerColor === 'red' && currentPlayer === Piece.RED) ||
                     (playerColor === 'black' && currentPlayer === Piece.BLACK);
    
    if (isMyTurn) {
      turnIndicatorEl.textContent = 'Your turn';
    } else {
      turnIndicatorEl.textContent = 'Waiting for opponent...';
    }
  } else {
    turnIndicatorEl.textContent =
      currentPlayer === Piece.RED ? 'Red to move' : 'Black to move';
  }
}

function getPiece(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return Piece.EMPTY;
  }
  return board[row][col];
}

function isPlayersPiece(piece, player) {
  if (player === Piece.RED) {
    return piece === Piece.RED || piece === Piece.RED_KING;
  }
  return piece === Piece.BLACK || piece === Piece.BLACK_KING;
}

function isMyPiece(piece) {
  if (!isMultiplayer || !playerColor) return false;
  if (playerColor === 'red') {
    return piece === Piece.RED || piece === Piece.RED_KING;
  } else {
    return piece === Piece.BLACK || piece === Piece.BLACK_KING;
  }
}

function getJumpMoves(row, col, piece, isKing, isRed) {
  const jumps = [];
  const directions = [];
  if (isKing || isRed) {
    directions.push([-1, -1], [-1, 1]);
  }
  if (isKing || !isRed) {
    directions.push([1, -1], [1, 1]);
  }

  for (const [dr, dc] of directions) {
    const jumpRow = row + dr;
    const jumpCol = col + dc;
    const landRow = row + 2 * dr;
    const landCol = col + 2 * dc;

    if (
      landRow < 0 ||
      landRow >= BOARD_SIZE ||
      landCol < 0 ||
      landCol >= BOARD_SIZE
    ) {
      continue;
    }

    const jumpedPiece = getPiece(jumpRow, jumpCol);
    const landPiece = getPiece(landRow, landCol);

    if (landPiece !== Piece.EMPTY) continue;

    if (isRed) {
      if (jumpedPiece !== Piece.BLACK && jumpedPiece !== Piece.BLACK_KING)
        continue;
    } else {
      if (jumpedPiece !== Piece.RED && jumpedPiece !== Piece.RED_KING)
        continue;
    }

    jumps.push([landRow, landCol]);
  }

  return jumps;
}

function getValidMoves(row, col) {
  const piece = getPiece(row, col);
  
  if (isMultiplayer) {
    if (piece === Piece.EMPTY || !isMyPiece(piece)) {
      return [];
    }
  } else {
    if (piece === Piece.EMPTY || !isPlayersPiece(piece, currentPlayer)) {
      return [];
    }
  }

  const moves = [];
  const isKing = piece === Piece.RED_KING || piece === Piece.BLACK_KING;
  const isRed = piece === Piece.RED || piece === Piece.RED_KING;

  const directions = [];
  if (isKing || isRed) {
    directions.push([-1, -1], [-1, 1]);
  }
  if (isKing || !isRed) {
    directions.push([1, -1], [1, 1]);
  }

  // Check captures first
  const jumps = getJumpMoves(row, col, piece, isKing, isRed);
  if (jumps.length > 0) {
    return jumps;
  }

  // Normal moves
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (
      nr >= 0 &&
      nr < BOARD_SIZE &&
      nc >= 0 &&
      nc < BOARD_SIZE &&
      getPiece(nr, nc) === Piece.EMPTY
    ) {
      moves.push([nr, nc]);
    }
  }

  return moves;
}

function hasAnyJumpsForPiece(row, col) {
  const piece = getPiece(row, col);
  if (piece === Piece.EMPTY) return false;

  const isKing = piece === Piece.RED_KING || piece === Piece.BLACK_KING;
  const isRed = piece === Piece.RED || piece === Piece.RED_KING;
  return getJumpMoves(row, col, piece, isKing, isRed).length > 0;
}

async function makeMove(fromRow, fromCol, toRow, toCol) {
  if (gameOver) return false;

  const validMoves = getValidMoves(fromRow, fromCol);
  if (!validMoves.some(([r, c]) => r === toRow && c === toCol)) {
    return false;
  }

  if (isMultiplayer) {
    // Send move to backend
    const success = await sendMove(fromRow, fromCol, toRow, toCol);
    if (success) {
      selectedSquare = null;
    }
    return success;
  }

  // Single player mode
  let piece = getPiece(fromRow, fromCol);
  board[fromRow][fromCol] = Piece.EMPTY;

  const rowDiff = Math.abs(toRow - fromRow);
  if (rowDiff === 2) {
    const jumpedRow = (fromRow + toRow) / 2;
    const jumpedCol = (fromCol + toCol) / 2;
    board[jumpedRow][jumpedCol] = Piece.EMPTY;
  }

  // Promotion
  if (piece === Piece.RED && toRow === 0) {
    piece = Piece.RED_KING;
  } else if (piece === Piece.BLACK && toRow === BOARD_SIZE - 1) {
    piece = Piece.BLACK_KING;
  }

  board[toRow][toCol] = piece;

  checkGameOver();

  if (!gameOver) {
    if (rowDiff === 2 && hasAnyJumpsForPiece(toRow, toCol)) {
      selectedSquare = { row: toRow, col: toCol };
    } else {
      selectedSquare = null;
      currentPlayer = currentPlayer === Piece.RED ? Piece.BLACK : Piece.RED;
    }
  }

  return true;
}

function checkGameOver() {
  let redCount = 0;
  let blackCount = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p === Piece.RED || p === Piece.RED_KING) redCount++;
      if (p === Piece.BLACK || p === Piece.BLACK_KING) blackCount++;
    }
  }

  if (redCount === 0) {
    gameOver = true;
    winner = Piece.BLACK;
    return;
  }
  if (blackCount === 0) {
    gameOver = true;
    winner = Piece.RED;
    return;
  }

  // Check if current player has moves
  let hasMoves = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (isPlayersPiece(p, currentPlayer) && getValidMoves(r, c).length > 0) {
        hasMoves = true;
        break;
      }
    }
    if (hasMoves) break;
  }

  if (!hasMoves) {
    gameOver = true;
    winner = currentPlayer === Piece.RED ? Piece.BLACK : Piece.RED;
  }
}

function attachSquareListeners() {
  const squares = boardEl.querySelectorAll('.square');
  squares.forEach((sq) => {
    sq.addEventListener('click', onSquareClick);
  });
}

async function onSquareClick(e) {
  const square = e.currentTarget;
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  const piece = getPiece(row, col);

  if (gameOver) return;

  if (isMultiplayer) {
    // In multiplayer, only allow selecting your own pieces
    if (selectedSquare) {
      if (await makeMove(selectedSquare.row, selectedSquare.col, row, col)) {
        renderBoard();
      }
      return;
    }
    
    if (isMyPiece(piece)) {
      selectedSquare = { row, col };
    } else {
      selectedSquare = null;
    }
    renderBoard();
    return;
  }

  // Single player mode
  if (selectedSquare) {
    if (await makeMove(selectedSquare.row, selectedSquare.col, row, col)) {
      renderBoard();
      return;
    }
  }

  if (isPlayersPiece(piece, currentPlayer)) {
    selectedSquare = { row, col };
  } else {
    selectedSquare = null;
  }

  renderBoard();
}

function attachPieceDragListeners() {
  const pieces = boardEl.querySelectorAll('.piece');
  pieces.forEach((pieceEl) => {
    pieceEl.addEventListener('pointerdown', onPiecePointerDown);
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPiecePointerDown(e) {
  const pieceEl = e.currentTarget;
  const fromRow = Number(pieceEl.dataset.row);
  const fromCol = Number(pieceEl.dataset.col);
  const piece = getPiece(fromRow, fromCol);

  if (gameOver) return;
  
  if (isMultiplayer) {
    if (!isMyPiece(piece)) return;
  } else {
    if (!isPlayersPiece(piece, currentPlayer)) return;
  }

  e.preventDefault();
  pieceEl.setPointerCapture(e.pointerId);

  const rect = pieceEl.getBoundingClientRect();
  dragState = {
    pieceEl,
    fromRow,
    fromCol,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left - rect.width / 2,
    offsetY: e.clientY - rect.top - rect.height / 2,
  };

  pieceEl.classList.add('dragging');
}

function getSquareFromClientPosition(x, y) {
  const rect = boardEl.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return null;
  }
  const cellWidth = rect.width / BOARD_SIZE;
  const cellHeight = rect.height / BOARD_SIZE;
  const col = Math.floor((x - rect.left) / cellWidth);
  const row = Math.floor((y - rect.top) / cellHeight);
  return { row, col };
}

function onPointerMove(e) {
  if (!dragState) return;
  const { pieceEl } = dragState;

  const boardRect = boardEl.getBoundingClientRect();
  const x = e.clientX - boardRect.left;
  const y = e.clientY - boardRect.top;

  pieceEl.style.position = 'absolute';
  pieceEl.style.left = `${x - pieceEl.offsetWidth / 2}px`;
  pieceEl.style.top = `${y - pieceEl.offsetHeight / 2}px`;
}

async function onPointerUp(e) {
  if (!dragState) return;
  const { pieceEl, fromRow, fromCol } = dragState;
  dragState = null;

  pieceEl.classList.remove('dragging');
  pieceEl.style.position = '';
  pieceEl.style.left = '';
  pieceEl.style.top = '';

  const square = getSquareFromClientPosition(e.clientX, e.clientY);
  if (!square) {
    renderBoard();
    return;
  }

  const { row: toRow, col: toCol } = square;
  if (await makeMove(fromRow, fromCol, toRow, toCol)) {
    renderBoard();
  } else {
    renderBoard();
  }
}

if (!isMultiplayer) {
  newGameBtn.addEventListener('click', () => {
    createInitialBoard();
    renderBoard();
  });
} else {
  // Hide new game button in multiplayer
  newGameBtn.style.display = 'none';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollInterval) clearInterval(pollInterval);
});
