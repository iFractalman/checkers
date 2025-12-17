"""
Game room management for multiplayer checkers
"""
import uuid
from dataclasses import dataclass, field
from typing import Optional, Dict
from checkers_game import CheckersGame, Piece


@dataclass
class GameRoom:
    """Represents a multiplayer game room"""
    room_id: str
    creator_id: int
    creator_username: str
    creator_color: Optional[str] = None  # "red" or "black"
    opponent_id: Optional[int] = None
    opponent_username: Optional[str] = None
    game: CheckersGame = field(default_factory=CheckersGame)
    
    def set_creator_color(self, color: str):
        """Set the creator's color"""
        self.creator_color = color
    
    def join(self, user_id: int, username: str):
        """Add opponent to the room"""
        if self.opponent_id is not None:
            raise ValueError("Room already has an opponent")
        self.opponent_id = user_id
        self.opponent_username = username
    
    def get_player_color(self, user_id: int) -> Optional[str]:
        """Get which color a user is playing"""
        if user_id == self.creator_id:
            return self.creator_color
        elif user_id == self.opponent_id:
            return "black" if self.creator_color == "red" else "red"
        return None
    
    def is_player_turn(self, user_id: int) -> bool:
        """Check if it's this user's turn"""
        player_color = self.get_player_color(user_id)
        if not player_color:
            return False
        
        current_piece = self.game.current_player
        if player_color == "red":
            return current_piece == Piece.RED
        else:
            return current_piece == Piece.BLACK
    
    def make_move(self, user_id: int, from_row: int, from_col: int, to_row: int, to_col: int) -> tuple[bool, Optional[str]]:
        """Make a move. Returns (success, error_message)"""
        if not self.opponent_id:
            return False, "Game not started - waiting for opponent"
        
        if not self.is_player_turn(user_id):
            return False, "Not your turn"
        
        player_color = self.get_player_color(user_id)
        piece = self.game.get_piece(from_row, from_col)
        
        # Validate piece belongs to player
        if player_color == "red" and piece not in [Piece.RED, Piece.RED_KING]:
            return False, "That's not your piece"
        if player_color == "black" and piece not in [Piece.BLACK, Piece.BLACK_KING]:
            return False, "That's not your piece"
        
        # Make the move
        if self.game.make_move(from_row, from_col, to_row, to_col):
            return True, None
        else:
            return False, "Invalid move"
    
    def to_dict(self, user_id: int) -> dict:
        """Convert room state to dict for API"""
        player_color = self.get_player_color(user_id)
        is_my_turn = self.is_player_turn(user_id) if player_color else False
        
        # Build board state
        board = []
        for row in range(8):
            board_row = []
            for col in range(8):
                piece = self.game.get_piece(row, col)
                if piece == Piece.EMPTY:
                    board_row.append(None)
                elif piece == Piece.RED:
                    board_row.append("red")
                elif piece == Piece.RED_KING:
                    board_row.append("red_king")
                elif piece == Piece.BLACK:
                    board_row.append("black")
                elif piece == Piece.BLACK_KING:
                    board_row.append("black_king")
            board.append(board_row)
        
        return {
            "room_id": self.room_id,
            "creator_username": self.creator_username,
            "opponent_username": self.opponent_username,
            "creator_color": self.creator_color,
            "player_color": player_color,
            "is_my_turn": is_my_turn,
            "current_player": "red" if self.game.current_player == Piece.RED else "black",
            "board": board,
            "game_over": self.game.game_over,
            "winner": "red" if self.game.winner == Piece.RED else ("black" if self.game.winner == Piece.BLACK else None),
        }


# In-memory storage (in production, use Redis or database)
rooms: Dict[str, GameRoom] = {}


def create_room(creator_id: int, creator_username: str) -> GameRoom:
    """Create a new game room"""
    room_id = str(uuid.uuid4())[:8]  # Short ID
    room = GameRoom(
        room_id=room_id,
        creator_id=creator_id,
        creator_username=creator_username,
    )
    rooms[room_id] = room
    return room


def get_room(room_id: str) -> Optional[GameRoom]:
    """Get a room by ID"""
    return rooms.get(room_id)
