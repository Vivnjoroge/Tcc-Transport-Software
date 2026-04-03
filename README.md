# Tcc-Transport-Software

## Current Status

- Front-end authentication pages are in place:
	- `signup.html` (create account using localStorage)
	- `index.html` (login using localStorage)
	- `dashboard.html` (temporary dashboard placeholder)

## SQLite Preparation

- SQLite schema is added in `database/schema.sql`.
- In this pure front-end setup, browser JavaScript cannot directly use SQLite files without adding a backend service or a special in-browser SQLite library.
- For now, auth uses localStorage so development can continue step-by-step.
- Next backend step (optional): connect forms to a small API (Node.js + SQLite) and replace localStorage auth.
# Motor-shop
