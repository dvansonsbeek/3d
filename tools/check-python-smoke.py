"""Import-smoke runner for the Python analysis scripts (plan 07 §9k item 7).

Driven by tools/check-python-smoke.mjs — not a user-facing script. Imports
every scripts/*.py as a MODULE (so `if __name__ == '__main__'` bodies do not
run) in one interpreter, from the scripts/ directory (the scripts put their
own directory on sys.path), with stdout/stderr captured, and classifies each:

  OK    imported
  SKIP  a THIRD-PARTY module is missing (numpy, astropy, …) — the analysis
        environment is not installed here (CI); not a defect of the script
  FAIL  anything else at import time — a KeyError on a removed JSON key, an
        ImportError of a repo-local module, a SyntaxError, a SystemExit

WHY: tools/lib/python/constants_scripts.py had been unimportable for months
(a KeyError on a retired key) and nothing reported it, because no gate ran
any Python. Rule 2 of check-python-physics catches drift of PINNED values;
this catches the rot of the import path itself.

ESSRT_PY_SMOKE_PLANT=1 injects one fake FAIL (fail-proof of the gate).

Prints one JSON object on the last line; the .mjs reads it.
"""
import contextlib
import importlib.util
import io
import json
import os
import sys
import time

ROOT = sys.argv[1]
SCRIPTS = os.path.join(ROOT, 'scripts')
LOCAL_DIRS = [SCRIPTS, os.path.join(ROOT, 'tools', 'lib', 'python'), os.path.join(ROOT, 'tools', 'fit', 'python')]
for d in reversed(LOCAL_DIRS):
    sys.path.insert(0, d)
os.chdir(SCRIPTS)

result = {'ok': [], 'skip': [], 'fail': [], 'seconds': 0.0, 'env': None}

try:
    import numpy  # noqa: F401
    import scipy  # noqa: F401
    result['env'] = 'numpy+scipy present'
except ModuleNotFoundError as e:
    result['env'] = f'analysis environment absent ({e.name}) — stage C skipped'
    print(json.dumps(result))
    sys.exit(0)

local_modules = set()
for d in LOCAL_DIRS:
    for f in os.listdir(d):
        if f.endswith('.py'):
            local_modules.add(f[:-3])

t0 = time.time()
for f in sorted(os.listdir(SCRIPTS)):
    if not f.endswith('.py'):
        continue
    name = f[:-3]
    buf = io.StringIO()
    try:
        if os.environ.get('ESSRT_PY_SMOKE_PLANT') == '1' and name == 'action_closure_test':
            raise KeyError('planted: a retired JSON key read at import')
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, f))
            mod = importlib.util.module_from_spec(spec)
            sys.modules[name] = mod
            spec.loader.exec_module(mod)
        result['ok'].append(name)
    except ModuleNotFoundError as e:
        if e.name and e.name.split('.')[0] in local_modules:
            result['fail'].append([name, f'ModuleNotFoundError (repo-local): {e}'])
        else:
            result['skip'].append([name, f'third-party module missing: {e.name}'])
    except SystemExit as e:
        result['fail'].append([name, f'SystemExit at import ({e.code})'])
    except BaseException as e:  # noqa: BLE001 — every import-time error is a finding
        result['fail'].append([name, f'{type(e).__name__}: {str(e)[:160]}'])
result['seconds'] = round(time.time() - t0, 1)
print(json.dumps(result))
