"""Telegram Checkers Bot"""
import logging
import os
from typing import Dict

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from checkers_game import CheckersGame, Piece

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# Public URL where the web UI is hosted (index.html of webapp).
# Set this via environment variable CHECKERS_WEBAPP_URL when you deploy the webapp.
WEBAPP_URL = os.getenv("CHECKERS_WEBAPP_URL", "")

# Store games per chat
games: Dict[int, CheckersGame] = {}


def get_game(chat_id: int) -> CheckersGame:
    """Get or create a game for a chat"""
    if chat_id not in games:
        games[chat_id] = CheckersGame()
    return games[chat_id]


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command handler"""
    text = (
        "🎮 Welcome to Checkers Bot!\n\n"
        "Commands:\n"
        "/newgame - Start a text game here\n"
        "/board - Show the text board\n"
        "/play - Open the drag-and-drop board (Web UI)\n"
        "/help - Show this help\n\n"
        "To make a move in text mode, send coordinates like:\n"
        "• Row,Col-Row,Col (e.g., 5,0-4,1)\n"
        "• Or chess notation (e.g., a6-b5)\n\n"
        "Red pieces (🔴) move first!"
    )

    if WEBAPP_URL:
        keyboard = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        text="Play with board UI",
                        web_app=WebAppInfo(url=WEBAPP_URL),
                    )
                ]
            ]
        )
        await update.message.reply_text(text, reply_markup=keyboard)
    else:
        await update.message.reply_text(text)


async def newgame(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start a new game"""
    chat_id = update.effective_chat.id
    games[chat_id] = CheckersGame()
    game = games[chat_id]
    
    board_text = game.get_board_string()
    current_player = "🔴 Red" if game.current_player == Piece.RED else "⚫ Black"
    
    await update.message.reply_text(
        f"🎮 New game started!\n\n"
        f"Current player: {current_player}\n\n"
        f"{board_text}\n\n"
        f"Make your move!"
    )


async def show_board(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show the current board"""
    chat_id = update.effective_chat.id
    game = get_game(chat_id)
    
    board_text = game.get_board_string()
    current_player = "🔴 Red" if game.current_player == Piece.RED else "⚫ Black"
    
    status_text = ""
    if game.game_over:
        winner = "🔴 Red" if game.winner == Piece.RED else "⚫ Black"
        status_text = f"\n🎉 Game Over! {winner} wins!"
    else:
        status_text = f"\nCurrent player: {current_player}"
    
    await update.message.reply_text(f"{board_text}{status_text}")


async def handle_move(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle move messages"""
    chat_id = update.effective_chat.id
    game = get_game(chat_id)
    
    if game.game_over:
        await update.message.reply_text("Game is over! Use /newgame to start a new game.")
        return
    
    move_str = update.message.text.strip()
    move = game.parse_move(move_str)
    
    if move is None:
        await update.message.reply_text(
            "❌ Invalid move format!\n\n"
            "Use format: Row,Col-Row,Col\n"
            "Example: 5,0-4,1\n\n"
            "Or chess notation: a6-b5"
        )
        return
    
    from_row, from_col, to_row, to_col = move
    
    # Validate move
    if not game.is_valid_position(from_row, from_col) or not game.is_valid_position(to_row, to_col):
        await update.message.reply_text("❌ Invalid coordinates! Use 0-7 for rows and columns.")
        return
    
    # Check if piece belongs to current player
    piece = game.get_piece(from_row, from_col)
    if game.current_player == Piece.RED and piece not in [Piece.RED, Piece.RED_KING]:
        await update.message.reply_text("❌ That's not your piece! Red's turn.")
        return
    if game.current_player == Piece.BLACK and piece not in [Piece.BLACK, Piece.BLACK_KING]:
        await update.message.reply_text("❌ That's not your piece! Black's turn.")
        return
    
    # Make the move
    if game.make_move(from_row, from_col, to_row, to_col):
        board_text = game.get_board_string()
        current_player = "🔴 Red" if game.current_player == Piece.RED else "⚫ Black"
        
        if game.game_over:
            winner = "🔴 Red" if game.winner == Piece.RED else "⚫ Black"
            await update.message.reply_text(
                f"✅ Move made!\n\n{board_text}\n\n🎉 Game Over! {winner} wins!"
            )
        else:
            await update.message.reply_text(
                f"✅ Move made!\n\n{board_text}\n\nCurrent player: {current_player}"
            )
    else:
        valid_moves = game.get_valid_moves(from_row, from_col)
        if not valid_moves:
            await update.message.reply_text("❌ No valid moves from that position!")
        else:
            moves_str = ", ".join([f"{r},{c}" for r, c in valid_moves])
            await update.message.reply_text(
                f"❌ Invalid move!\n\n"
                f"Valid moves from ({from_row},{from_col}): {moves_str}"
            )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Help command handler"""
    await update.message.reply_text(
        "🎮 Checkers Bot Help\n\n"
        "📋 Commands:\n"
        "/start - Welcome message\n"
        "/newgame - Start a new game\n"
        "/board - Show current board\n"
        "/help - Show this help\n\n"
        "🎯 Making Moves:\n"
        "Send coordinates in format:\n"
        "• Row,Col-Row,Col\n"
        "  Example: 5,0-4,1\n"
        "• Or chess notation: a6-b5\n\n"
        "📐 Board Coordinates:\n"
        "Rows: 0-7 (top to bottom)\n"
        "Cols: 0-7 (left to right)\n\n"
        "🎨 Pieces:\n"
        "🔴 Red piece\n"
        "👑 Red king\n"
        "⚫ Black piece\n"
        "♛ Black king\n\n"
        "Rules:\n"
        "• Red moves first\n"
        "• Must capture if possible\n"
        "• Kings can move backward\n"
        "• Win by capturing all opponent pieces"
    )


async def play(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a button that opens the Web UI inside Telegram."""
    if not WEBAPP_URL:
        await update.message.reply_text(
            "The Web UI is not configured yet.\n"
            "Set CHECKERS_WEBAPP_URL env variable to your hosted webapp URL "
            "(for example, https://your-domain.example/checkers/)."
        )
        return

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="Play Checkers",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )
    await update.message.reply_text(
        "Tap the button below to open the drag-and-drop board.",
        reply_markup=keyboard,
    )


def main():
    """Start the bot"""
    # Get token from environment variable or ask user
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        print("⚠️  Please set TELEGRAM_BOT_TOKEN environment variable")
        print("Or edit bot.py and add your token directly (not recommended for production)")
        token = input("Enter your Telegram bot token: ").strip()
    
    if not token:
        print("❌ No token provided. Exiting.")
        return
    
    # Create application
    application = Application.builder().token(token).build()
    
    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("newgame", newgame))
    application.add_handler(CommandHandler("board", show_board))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("play", play))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_move))
    
    # Start bot
    print("🤖 Bot starting...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()


