from __future__ import annotations

import subprocess
import sys


COMMANDS = [
    ["modalities", "--course-id", "34", "--year", "2022"],
    ["courses", "--year", "2022"],
    ["offers", "--course-id", "34", "--year", "2022"],
    ["curriculum", "--course-id", "34", "--year", "2022"],
    ["prereqs", "--course-id", "34", "--year", "2022"],
    ["semester-map", "--course-id", "34", "--year", "2022"],
]


def main() -> None:
    for args in COMMANDS:
        cmd = [sys.executable, "-m", "crawler_app.cli", *args]
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()
