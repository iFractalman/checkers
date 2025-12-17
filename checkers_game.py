"""
Checkers game logic implementation
"""
from enum import Enum
from typing import List, Tuple, Optional


class Piece(Enum):
    """Represents a checkers piece"""
    EMPTY = 0
    RED = 1
    RED_KING = 2
    BLACK = 3
    BLACK_KING = 4


class CheckersGame:
    """Checkers game state and logic"""
    
    BOARD_SIZE = 8
    
    def __init__(self):
        self.board = [[Piece.EMPTY for _ in range(self.BOARD_SIZE)] for _ in range(self.BOARD_SIZE)]
        self.current_player = Piece.RED  # RED starts
        self.game_over = False
        self.winner = None
        self._initialize_board()
    
    def _initialize_board(self):
        """Set up the initial board state"""
        # Place black pieces (top)
        for row in range(3):
            for col in range(self.BOARD_SIZE):
                if (row + col) % 2 == 1:
                    self.board[row][col] = Piece.BLACK
        
        # Place red pieces (bottom)
        for row in range(5, 8):
            for col in range(self.BOARD_SIZE):
                if (row + col) % 2 == 1:
                    self.board[row][col] = Piece.RED
    
    def is_valid_position(self, row: int, col: int) -> bool:
        """Check if position is on the board"""
        return 0 <= row < self.BOARD_SIZE and 0 <= col < self.BOARD_SIZE
    
    def is_valid_square(self, row: int, col: int) -> bool:
        """Check if square is playable (dark squares only)"""
        return (row + col) % 2 == 1
    
    def get_piece(self, row: int, col: int) -> Piece:
        """Get piece at position"""
        if not self.is_valid_position(row, col):
            return Piece.EMPTY
        return self.board[row][col]
    
    def get_valid_moves(self, row: int, col: int) -> List[Tuple[int, int]]:
        """Get all valid moves for a piece"""
        piece = self.get_piece(row, col)
        if piece == Piece.EMPTY:
            return []
        
        # Check if it's the current player's piece
        if piece not in [Piece.RED, Piece.RED_KING] and self.current_player == Piece.RED:
            return []
        if piece not in [Piece.BLACK, Piece.BLACK_KING] and self.current_player == Piece.BLACK:
            return []
        
        moves = []
        is_king = piece in [Piece.RED_KING, Piece.BLACK_KING]
        is_red = piece in [Piece.RED, Piece.RED_KING]
        
        # Directions: forward for regular pieces, both for kings
        directions = []
        if is_king or is_red:
            directions.append((-1, -1))  # Up-left
            directions.append((-1, 1))   # Up-right
        if is_king or not is_red:
            directions.append((1, -1))   # Down-left
            directions.append((1, 1))    # Down-right
        
        # Check regular moves
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
            if self.is_valid_position(new_row, new_col) and self.get_piece(new_row, new_col) == Piece.EMPTY:
                moves.append((new_row, new_col))
        
        # Check jump moves
        jump_moves = self._get_jump_moves(row, col, piece, is_king, is_red)
        if jump_moves:
            return jump_moves  # Must take jumps if available
        
        return moves
    
    def _get_jump_moves(self, row: int, col: int, piece: Piece, is_king: bool, is_red: bool) -> List[Tuple[int, int]]:
        """Get all valid jump moves (captures)"""
        jumps = []
        directions = []
        if is_king or is_red:
            directions.append((-1, -1))
            directions.append((-1, 1))
        if is_king or not is_red:
            directions.append((1, -1))
            directions.append((1, 1))
        
        for dr, dc in directions:
            jump_row, jump_col = row + dr, col + dc
            land_row, land_col = row + 2*dr, col + 2*dc
            
            if not self.is_valid_position(land_row, land_col):
                continue
            
            jumped_piece = self.get_piece(jump_row, jump_col)
            land_piece = self.get_piece(land_row, land_col)
            
            # Check if we can jump
            if land_piece != Piece.EMPTY:
                continue
            
            # Check if jumped piece is opponent's
            if is_red:
                if jumped_piece not in [Piece.BLACK, Piece.BLACK_KING]:
                    continue
            else:
                if jumped_piece not in [Piece.RED, Piece.RED_KING]:
                    continue
            
            jumps.append((land_row, land_col))
        
        return jumps
    
    def make_move(self, from_row: int, from_col: int, to_row: int, to_col: int) -> bool:
        """Make a move. Returns True if successful"""
        if self.game_over:
            return False
        
        valid_moves = self.get_valid_moves(from_row, from_col)
        if (to_row, to_col) not in valid_moves:
            return False
        
        piece = self.board[from_row][from_col]
        self.board[from_row][from_col] = Piece.EMPTY
        
        # Check if it's a jump
        row_diff = abs(to_row - from_row)
        if row_diff == 2:
            # Capture the jumped piece
            jumped_row = (from_row + to_row) // 2
            jumped_col = (from_col + to_col) // 2
            self.board[jumped_row][jumped_col] = Piece.EMPTY
        
        # Check for promotion to king
        if piece == Piece.RED and to_row == 0:
            piece = Piece.RED_KING
        elif piece == Piece.BLACK and to_row == self.BOARD_SIZE - 1:
            piece = Piece.BLACK_KING
        
        self.board[to_row][to_col] = piece
        
        # Check for game over
        self._check_game_over()
        
        # Switch player if no more jumps available
        if row_diff != 2 or not self._has_jumps(to_row, to_col):
            self.current_player = Piece.BLACK if self.current_player == Piece.RED else Piece.RED
        
        return True
    
    def _has_jumps(self, row: int, col: int) -> bool:
        """Check if piece at position has any jump moves"""
        piece = self.get_piece(row, col)
        if piece == Piece.EMPTY:
            return False
        
        is_king = piece in [Piece.RED_KING, Piece.BLACK_KING]
        is_red = piece in [Piece.RED, Piece.RED_KING]
        jumps = self._get_jump_moves(row, col, piece, is_king, is_red)
        return len(jumps) > 0
    
    def _check_game_over(self):
        """Check if game is over"""
        red_pieces = sum(1 for row in self.board for piece in row if piece in [Piece.RED, Piece.RED_KING])
        black_pieces = sum(1 for row in self.board for piece in row if piece in [Piece.BLACK, Piece.BLACK_KING])
        
        if red_pieces == 0:
            self.game_over = True
            self.winner = Piece.BLACK
        elif black_pieces == 0:
            self.game_over = True
            self.winner = Piece.RED
        
        # Check if current player has any moves
        has_moves = False
        for row in range(self.BOARD_SIZE):
            for col in range(self.BOARD_SIZE):
                piece = self.get_piece(row, col)
                if (self.current_player == Piece.RED and piece in [Piece.RED, Piece.RED_KING]) or \
                   (self.current_player == Piece.BLACK and piece in [Piece.BLACK, Piece.BLACK_KING]):
                    if self.get_valid_moves(row, col):
                        has_moves = True
                        break
            if has_moves:
                break
        
        if not has_moves and not self.game_over:
            self.game_over = True
            self.winner = Piece.BLACK if self.current_player == Piece.RED else Piece.RED
    
    def get_board_string(self) -> str:
        """Get string representation of board for Telegram"""
        lines = []
        lines.append("  0 1 2 3 4 5 6 7")
        
        for row in range(self.BOARD_SIZE):
            line = f"{row} "
            for col in range(self.BOARD_SIZE):
                piece = self.board[row][col]
                if piece == Piece.EMPTY:
                    if self.is_valid_square(row, col):
                        line += "⬜ "
                    else:
                        line += "⬛ "
                elif piece == Piece.RED:
                    line += "🔴 "
                elif piece == Piece.RED_KING:
                    line += "👑 "
                elif piece == Piece.BLACK:
                    line += "⚫ "
                elif piece == Piece.BLACK_KING:
                    line += "♛ "
            lines.append(line)
        
        return "\n".join(lines)
    
    def parse_move(self, move_str: str) -> Optional[Tuple[int, int, int, int]]:
        """Parse move string like 'a3-b4' or '0,2-1,3'"""
        try:
            # Try format: row,col-row,col
            if '-' in move_str:
                parts = move_str.split('-')
                if len(parts) == 2:
                    from_part = parts[0].strip().split(',')
                    to_part = parts[1].strip().split(',')
                    if len(from_part) == 2 and len(to_part) == 2:
                        from_row, from_col = int(from_part[0]), int(from_part[1])
                        to_row, to_col = int(to_part[0]), int(to_part[1])
                        return (from_row, from_col, to_row, to_col)
        except ValueError:
            pass
        
        # Try format: a3-b4 (chess notation)
        try:
            if '-' in move_str and len(move_str) >= 5:
                parts = move_str.split('-')
                if len(parts) == 2:
                    from_str = parts[0].strip().lower()
                    to_str = parts[1].strip().lower()
                    if len(from_str) >= 2 and len(to_str) >= 2:
                        from_col = ord(from_str[0]) - ord('a')
                        from_row = int(from_str[1]) - 1
                        to_col = ord(to_str[0]) - ord('a')
                        to_row = int(to_str[1]) - 1
                        return (from_row, from_col, to_row, to_col)
        except (ValueError, IndexError):
            pass
        
        return None


