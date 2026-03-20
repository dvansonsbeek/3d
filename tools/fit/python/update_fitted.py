"""
Update a section in tools/lib/constants/fitted-coefficients.js.

Uses @AUTO:<SECTION>:START / @AUTO:<SECTION>:END markers to find and replace
the content between them. The markers themselves are preserved.

Usage:
    from update_fitted import update_section
    update_section('PERI_HARMONICS', new_js_content)
"""

import re
from pathlib import Path

FITTED_FILE = Path(__file__).resolve().parent.parent.parent / 'lib' / 'constants' / 'fitted-coefficients.js'


def update_section(section_name: str, new_content: str):
    """Replace content between @AUTO:<section_name>:START and :END markers.

    Args:
        section_name: e.g. 'PERI_HARMONICS', 'OBLIQUITY', 'YEAR_LENGTH', etc.
        new_content: New JavaScript code to insert (without the markers).
    """
    text = FITTED_FILE.read_text()

    start_marker = f'// @AUTO:{section_name}:START'
    end_marker = f'// @AUTO:{section_name}:END'

    # Find markers
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)

    if start_idx == -1:
        raise ValueError(f'Marker {start_marker} not found in {FITTED_FILE}')
    if end_idx == -1:
        raise ValueError(f'Marker {end_marker} not found in {FITTED_FILE}')

    # Keep the START line (including its comment), replace everything until END line
    start_line_end = text.index('\n', start_idx) + 1
    end_line_start = end_idx

    # Build new file content
    new_text = text[:start_line_end] + new_content.rstrip('\n') + '\n' + text[end_line_start:]

    FITTED_FILE.write_text(new_text)
    print(f'  Updated {section_name} in {FITTED_FILE.name}')
