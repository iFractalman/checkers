// Simple checkers implementation in JS with drag & tap support

const BOARD_SIZE = 8;
const Piece = {
  EMPTY: 0,
  RED: 1,
  RED_KING: 2,
  BLACK: 3,
  BLACK_KING: 4,
};

let board = [];
let currentPlayer = Piece.RED;
let gameOver = false;
let winner = null;

let selectedSquare = null; // {row, col}
let dragState = null; // {pieceEl, fromRow, fromCol, offsetX, offsetY}

const boardEl = document.getElementById('board');
const turnIndicatorEl = document.getElementById('turn-indicator');
const newGameBtn = document.getElementById('new-game-btn');

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

  turnIndicatorEl.textContent =
    currentPlayer === Piece.RED ? 'Red to move' : 'Black to move';
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
  if (piece === Piece.EMPTY || !isPlayersPiece(piece, currentPlayer)) {
    return [];
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

function makeMove(fromRow, fromCol, toRow, toCol) {
  if (gameOver) return false;

  const validMoves = getValidMoves(fromRow, fromCol);
  if (!validMoves.some(([r, c]) => r === toRow && c === toCol)) {
    return false;
  }

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
      // Multi-capture: same player moves again with same piece
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

function onSquareClick(e) {
  const square = e.currentTarget;
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  const piece = getPiece(row, col);

  if (gameOver) return;

  if (selectedSquare) {
    // Try move
    if (makeMove(selectedSquare.row, selectedSquare.col, row, col)) {
      renderBoard();
      return;
    }
  }

  // Select piece if it belongs to current player
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

  if (gameOver || !isPlayersPiece(piece, currentPlayer)) return;

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

function onPointerUp(e) {
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
  if (makeMove(fromRow, fromCol, toRow, toCol)) {
    renderBoard();
  } else {
    renderBoard();
  }
}

newGameBtn.addEventListener('click', () => {
  createInitialBoard();
  renderBoard();
});

// Init
createInitialBoard();
renderBoard();


