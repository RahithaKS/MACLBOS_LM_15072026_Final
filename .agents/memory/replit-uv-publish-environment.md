---
name: Replit uv publishing environment
description: Prevent Python publish builds from attempting writes to Replit's read-only Nix Python installation.
---

For this workspace, publishing must set `UV_PROJECT_ENVIRONMENT` to a writable project-local virtual-environment path (for example, `.venv`).

**Why:** Replit's automatic `uv sync` otherwise selected the Nix-managed Python site-packages path, which is read-only during publishing and caused dependency installation to fail with a permission error.

**How to apply:** Keep the environment setting in the validated Replit configuration whenever the Python `pyproject.toml` remains part of the project. Confirm with `uv sync --locked` using the same environment value before retrying a failed publish.