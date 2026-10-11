# QuickNotes System Design

QuickNotes is a note-taking service design project. It includes a browser API client that practises GET, POST, and DELETE requests against JSONPlaceholder, plus design documents for a production-ready service for one million registered users.

## Project files

- `index.html` — API client interface.
- `style.css` — responsive styling and success/error status styles.
- `api.js` — fetch wrapper, loading notes, creating notes, deleting notes, validation, and error handling.
- `docs/api-design.md` — REST endpoints, JSON examples, and error responses.
- `docs/data-model.md` — SQL schema, relationships, queries, indexes, and database choice.
- `docs/architecture.md` — requirements, load estimates, architecture diagram, request flows, and trade-offs.

## How to run the API client

1. Download or clone this repository.
2. Open `index.html` in a modern web browser. Alternatively, use the VS Code Live Server extension to serve the folder locally.
3. Click **Load notes** to retrieve ten sample posts from `https://jsonplaceholder.typicode.com/posts?_limit=10`.
4. Enter a title and optional body, then select **Create note** to send a POST request.
5. Select **Delete** on a note to send a DELETE request.

An internet connection is required. JSONPlaceholder is a practice API: it simulates create and delete responses but does not permanently store the changes. The client keeps simulated changes in the page's in-memory list until it is reloaded.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture and scaling](docs/architecture.md)

## What I learned

- How to use `fetch`, `async`/`await`, reusable request functions, and HTTP status checks.
- Why input validation, friendly error states, and safe DOM updates using `textContent` matter.
- How REST endpoints and status codes describe API behaviour.
- How primary keys, foreign keys, and a join table model relational data.
- How load estimates, caches, read replicas, queues, and redundant servers support scaling.

## Limitations

This repository is a front-end practice client and system design exercise, not a deployed production backend. The production API hostname in the design document is illustrative. A real service still needs authentication, authorisation, a deployed database, monitoring, backups, and operational security.
