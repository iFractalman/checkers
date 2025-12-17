# Telegram Checkers Bot

A Telegram bot that lets you play checkers (draughts) in chat!

## Features

- 🎮 Play checkers in Telegram chat
- 📱 Simple text-based interface
- 🎯 Multiple move formats supported
- 👑 King promotion
- ⚡ Capture validation
- 🏆 Win detection

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token you receive

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Bot

**Option 1: Set environment variable (recommended)**
```bash
# Windows PowerShell
$env:TELEGRAM_BOT_TOKEN="your_token_here"
python bot.py

# Windows CMD
set TELEGRAM_BOT_TOKEN=your_token_here
python bot.py

# Linux/Mac
export TELEGRAM_BOT_TOKEN="your_token_here"
python bot.py
```

**Option 2: Enter token when prompted**
```bash
python bot.py
```

## Usage

1. Start a chat with your bot on Telegram
2. Send `/start` to begin
3. Send `/newgame` to start a new game
4. Make moves using coordinates:
   - Format: `Row,Col-Row,Col` (e.g., `5,0-4,1`)
   - Or chess notation: `a6-b5`

### Commands

- `/start` - Welcome message and instructions
- `/newgame` - Start a new checkers game
- `/board` - Show the current board state
- `/help` - Show help message

### Making Moves

Send coordinates in one of these formats:
- `5,0-4,1` (row,col-row,col)
- `a6-b5` (chess notation)

### Board Layout

- Rows: 0-7 (top to bottom)
- Columns: 0-7 (left to right)
- 🔴 Red pieces move first
- ⚫ Black pieces move second

### Game Rules

- Red moves first
- Must capture if possible
- Regular pieces move forward only
- Kings (👑/♛) can move backward
- Win by capturing all opponent pieces or blocking all moves

## Example Game

```
/start
/newgame
5,0-4,1
2,1-3,0
...
```

## Notes

- Each chat maintains its own game state
- Games persist until `/newgame` is called
- The bot validates all moves according to checkers rules


