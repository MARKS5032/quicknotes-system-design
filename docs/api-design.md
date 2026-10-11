# QuickNotes REST API Design

## Overview

The production API is hosted at `https://api.quicknotes.example/v1`. The `.example` domain is illustrative and should be replaced with the deployed API hostname. The API uses JSON, HTTPS, authentication, and resource-oriented URLs. JSONPlaceholder is only used by the practice client and is not the production API.

## Endpoints 

| Method | Path | Description | Success status |
|---|---|---|---|
| `GET` | `/v1/notes` | List the authenticated user's notes; supports `?limit=20&offset=0` | `200 OK` |
| `GET` | `/v1/notes/{noteId}` | Retrieve one note owned by the authenticated user | `200 OK` |
| `POST` | `/v1/notes` | Create a note | `201 Created` |
| `PUT` | `/v1/notes/{noteId}` | Replace a note's editable fields | `200 OK` |
| `PATCH` | `/v1/notes/{noteId}` | Partially update a note | `200 OK` |
| `DELETE` | `/v1/notes/{noteId}` | Delete a note | `204 No Content` |
| `GET` | `/v1/tags` | List tags belonging to the authenticated user | `200 OK` |
| `POST` | `/v1/notes/{noteId}/tags` | Attach an existing tag to a note | `201 Created` |

All endpoints except any explicitly public health endpoint require a valid authenticated session or bearer token. The server must verify that the authenticated user owns the requested note or tag.

## Create a note

### Request

`POST /v1/notes`

```http
Content-Type: application/json
Authorization: Bearer <access-token>
```

```json
{
  "title": "Revision notes",
  "body": "Review database joins before the test."
}
```

### Response

Status: `201 Created`

```json
{
  "id": 101,
  "userId": 7,
  "title": "Revision notes",
  "body": "Review database joins before the test.",
  "createdAt": "2026-10-11T09:00:00Z",
  "updatedAt": "2026-10-11T09:00:00Z"
}
```

The server generates the ID and timestamps; clients must not choose another user's `userId`.

## List notes

### Request

`GET /v1/notes?limit=20&offset=0`

```http
Authorization: Bearer <access-token>
```

### Response

Status: `200 OK`

```json
{
  "items": [
    {
      "id": 101,
      "userId": 7,
      "title": "Revision notes",
      "body": "Review database joins before the test.",
      "createdAt": "2026-10-11T09:00:00Z",
      "updatedAt": "2026-10-11T09:00:00Z"
    }
  ],
  "limit": 20,
  "offset": 0,
  "total": 1
}
```

## Error status codes

| Status | Meaning | Example |
|---|---|---|
| `400 Bad Request` | The request is malformed or validation fails | A note title is missing or longer than 100 characters |
| `401 Unauthorized` | Authentication is missing or invalid | The bearer token is expired |
| `403 Forbidden` | The user is authenticated but not allowed to perform the action | A user attempts to edit a note they do not own |
| `404 Not Found` | The resource does not exist or is not available to the user | The requested note ID cannot be found |
| `500 Internal Server Error` | An unexpected server failure occurred | The server encounters an unhandled database error |

### Example error body

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 100 characters or fewer."
  }
}
```

## API conventions

- Use HTTPS for all requests.
- Use JSON request and response bodies.
- Validate all input on the server, even when the client also validates it.
- Use parameterised SQL queries to prevent SQL injection.
- Return consistent error bodies without exposing passwords, tokens, or internal stack traces.
- Paginate list endpoints to avoid returning an unbounded number of notes.
