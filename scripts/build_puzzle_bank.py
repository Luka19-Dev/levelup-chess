"""Builds the puzzle bank for the puzzles page from the lichess puzzle database
(CC0, database.lichess.org): streams the compressed CSV, keeps well-tested
puzzles rated 400-1999, checks every move, works out the side, game stage and
winning piece, and writes one file per 100 rating points plus an index of counts.

Python, not Node: the database is "seekable" zstd with metadata frames all
through it, which the zstandard package reads and Node's decoder rejects.

usage: pip install zstandard chess
       python scripts/build_puzzle_bank.py
"""
import csv
import io
import json
import os
import urllib.request

import chess
import zstandard

URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
OUT = "public/puzzles"
MIN, MAX = 400, 1999
PER_BAND = 2600  # general sample per 100-point band
PER_THEME = 120  # and at least this many per theme per band, when the database has them

# the themes offered as their own path on the puzzles page, in display order
THEMES = ["mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer", "discoveredAttack", "doubleCheck",
          "hangingPiece", "trappedPiece", "backRankMate", "smotheredMate", "promotion", "sacrifice",
          "deflection", "capturingDefender"]
STAGES = ["opening", "middlegame", "endgame"]

bands: dict[int, list] = {}
theme_count: dict[tuple[int, str], int] = {}


def analyse(fen: str, moves: list[str]):
    """Plays the puzzle through; returns (side to solve, winning piece) or None if any move is illegal."""
    try:
        board = chess.Board(fen)
        board.push_uci(moves[0])
        side = "w" if board.turn == chess.WHITE else "b"
        piece = board.piece_at(chess.parse_square(moves[1][:2])).symbol().lower()
        for m in moves[1:]:
            move = chess.Move.from_uci(m)
            if move not in board.legal_moves:
                return None
            board.push(move)
        return side, piece
    except (ValueError, AttributeError):
        return None


req = urllib.request.Request(URL, headers={"User-Agent": "levelup-chess-builder"})
with urllib.request.urlopen(req) as resp:
    text = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(resp), encoding="utf-8")
    rows = csv.reader(text)
    next(rows)
    n = 0
    for row in rows:
        n += 1
        if n % 1_000_000 == 0:
            print(f"{n} rows read, {sum(len(v) for v in bands.values())} kept", flush=True)
        pid, fen, moves_raw, rating, rd, pop, plays, themes_raw = row[:8]
        rating = int(rating)
        if rating < MIN or rating > MAX or int(rd) > 90 or int(pop) < 80 or int(plays) < 200:
            continue
        themes = themes_raw.split()
        stage = next((i for i, s in enumerate(STAGES) if s in themes), -1)
        if stage < 0:
            continue
        b = rating // 100 * 100
        kept = bands.setdefault(b, [])
        ours = [t for t in themes if t in THEMES]
        general = len(kept) < PER_BAND
        needed = any(theme_count.get((b, t), 0) < PER_THEME for t in ours)
        if not general and not needed:
            continue
        moves = moves_raw.split()
        facts = analyse(fen, moves)
        if not facts:
            continue
        for t in ours:
            theme_count[(b, t)] = theme_count.get((b, t), 0) + 1
        # compact row: id, fen, moves, rating, side, stage, winning piece, theme indexes
        kept.append([pid, fen, moves_raw, rating, facts[0], stage, facts[1], [THEMES.index(t) for t in ours]])

os.makedirs(OUT, exist_ok=True)
index = {"themes": THEMES, "bands": {}}
for b in sorted(bands):
    kept = bands[b]
    with open(f"{OUT}/{b}.json", "w", encoding="utf-8") as f:
        json.dump(kept, f, separators=(",", ":"))
    # counts for the live "N puzzles" readout, without loading every band
    combos: dict[str, int] = {}
    tcount: dict[str, int] = {}
    for r in kept:
        key = f"{r[4]}{r[5]}{r[6]}"
        combos[key] = combos.get(key, 0) + 1
        for t in r[7]:
            tcount[THEMES[t]] = tcount.get(THEMES[t], 0) + 1
    index["bands"][str(b)] = {"total": len(kept), "combos": combos, "themes": tcount}
with open(f"{OUT}/index.json", "w", encoding="utf-8") as f:
    json.dump(index, f, separators=(",", ":"))

print(f"done: {n} rows read")
for b, info in index["bands"].items():
    print(b, info["total"], "fork", info["themes"].get("fork", 0), "mateIn3", info["themes"].get("mateIn3", 0))
