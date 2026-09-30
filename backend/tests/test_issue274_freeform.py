"""Proving test for issue #274: expose the freeform send-email route in the OpenAPI schema.

AC-1: POST /api/contacts/{contact_id}/send-email is no longer hidden
      from the OpenAPI schema: it appears in app.openapi() with its
      request body (subject, body) and a 202 response, and the committed
      contract artifact (backend/openapi.json) contains the path.  The
      route gains no new response metadata, error responses, or typed 202
      response schema beyond its existing declaration.
"""

import json
from pathlib import Path

SEND_EMAIL_PATH = "/api/contacts/{contact_id}/send-email"
OPENAPI_ARTIFACT = Path(__file__).resolve().parent.parent / "openapi.json"


def _body_object_schema(schema: dict, operation: dict) -> dict:
    """Resolve the operation's application/json request body to an object schema."""
    content = operation["requestBody"]["content"]["application/json"]
    body_schema = content["schema"]
    if "$ref" in body_schema:
        name = body_schema["$ref"].rsplit("/", 1)[-1]
        body_schema = schema["components"]["schemas"][name]
    return body_schema


def test_issue274_freeform(app):
    # ---------------------------------------------------------- #
    # app.openapi(): the live application schema
    # ---------------------------------------------------------- #
    schema = app.openapi()
    assert SEND_EMAIL_PATH in schema["paths"], (
        f"{SEND_EMAIL_PATH} must be registered in the OpenAPI schema "
        "(the route must not be hidden from the OpenAPI schema)"
    )
    operation = schema["paths"][SEND_EMAIL_PATH]
    assert "post" in operation, f"POST must be declared for {SEND_EMAIL_PATH}"
    post = operation["post"]

    # Request body: the ContactEmailRequest model (subject, body).
    assert "requestBody" in post
    assert post["requestBody"].get("required") is True
    body = _body_object_schema(schema, post)
    assert set(body["properties"]) == {"subject", "body"}
    assert set(body["required"]) == {"subject", "body"}

    # The declared 202 response is present, with no typed 202 response
    # schema and no error responses added beyond the route's existing
    # declaration (the 422 is FastAPI's standard validation error,
    # generated identically for every body route).
    assert "202" in post["responses"]
    assert set(post["responses"]) == {"202", "422"}
    assert post["responses"]["202"]["content"]["application/json"]["schema"] == {}

    # ---------------------------------------------------------- #
    # The committed contract artifact: backend/openapi.json
    # ---------------------------------------------------------- #
    committed = json.loads(OPENAPI_ARTIFACT.read_text())
    assert SEND_EMAIL_PATH in committed["paths"], (
        f"{SEND_EMAIL_PATH} must be present in the committed "
        "backend/openapi.json artifact"
    )
    assert "post" in committed["paths"][SEND_EMAIL_PATH], (
        f"POST must be declared for {SEND_EMAIL_PATH} in the committed "
        "backend/openapi.json artifact"
    )
