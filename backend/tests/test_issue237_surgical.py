"""Proving test: test_list_pagination_hardening covers GET /api/audit."""

import inspect

import tests.test_list_pagination_hardening as target


def test_issue237_surgical():
    source = inspect.getsource(target.test_list_pagination_hardening)
    assert "/api/audit" in source, (
        "test_list_pagination_hardening must include /api/audit in its "
        "endpoints list so the 'every list endpoint' claim holds"
    )
