"""Campaign-artifact input fingerprinting — Python twin of
tools/lib/artifact-inputs.js (same convention, same gate).

    "inputs": {
      "generator": "python tools/fit/python/eval_precession_physical.py --write",
      "files": { "<repo-relative path>": "sha256:<hex>", ... }
    }

The generator script itself MUST be listed — an edited generator with an
un-regenerated artifact is stale by definition. The freshness gate
(tools/verify/artifact-freshness.js, in `npm run check`) re-hashes every
listed path and fails on any mismatch.
"""

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent


def hash_file(rel_path: str) -> str:
    digest = hashlib.sha256((ROOT / rel_path).read_bytes()).hexdigest()
    return f'sha256:{digest}'


def build_inputs_block(generator_command: str, rel_paths) -> dict:
    return {
        'generator': generator_command,
        'files': {rel: hash_file(rel) for rel in sorted(rel_paths)},
    }
