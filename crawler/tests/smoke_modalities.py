from __future__ import annotations

import subprocess
import sys


def main() -> None:
    cmd = [
        sys.executable,
        "-m",
        "crawler_app.cli",
        "modalities",
        "--course-id",
        "34",
        "--year",
        "2022",
    ]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()

