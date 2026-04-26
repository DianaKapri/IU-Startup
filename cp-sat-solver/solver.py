"""CLI: читает GeneratorInput JSON из stdin, пишет GeneratorOutput в stdout.

Используется Node-бэкендом через child_process.spawn:
    cat input.json | python3 solver.py > output.json

Логи (если есть) в stderr — не мешают парсингу stdout.
"""
import json
import sys

from models import GeneratorInput, GeneratorOutput
from builder import build_and_solve


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        inp = GeneratorInput(**data)
    except Exception as e:
        out = {"ok": False, "error": f"Bad input: {e}"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    try:
        result = build_and_solve(inp)
        print(result.model_dump_json(exclude_none=False))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        out = GeneratorOutput(
            ok=False,
            summary={
                "classesCount": len(inp.classes),
                "placedLessons": 0,
                "status": "error",
                "solveTimeMs": 0,
                "buildTimeMs": 0,
                "variablesCount": 0,
            },
            error=f"Internal error: {e}",
        )
        print(out.model_dump_json(exclude_none=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
