# QuickNotes Data Model

## Database choice

QuickNotes uses a relational SQL database because users, notes, tags, and their relationships are structured and need referential integrity. Primary keys, foreign keys, unique constraints, transactions, and joins make it easier to protect data consistency. SQLite is convenient for local practice; a production deployment could use PostgreSQL or another managed relational database.

## Entities and columns

### `users`

- `id`: integer primary key.
- `name`: required user name.
- `email`: required unique email address.
- `password_hash`: required hash of the password; never store plain-text passwords.
- `created_at`: timestamp for account creation.

### `notes`

- `id`: integer primary key.
- `user_id`: required foreign key to `users.id`.
- `title`: required text, maximum 100 characters.
- `body`: optional text.
- `created_at` and `updated_at`: timestamps.

### `tags`

- `id`: integer primary key.
- `user_id`: required foreign key to `users.id`.
- `name`: required tag name.
- A user cannot create duplicate tags with the same name.

### `note_tags`

- `note_id`: foreign key to `notes.id`.
- `tag_id`: foreign key to `tags.id`.
- The pair `(note_id, tag_id)` is the composite primary key, preventing duplicate links.

## Relationships

**One-to-many:** One user can own many notes, but each note belongs to one user. One user can also create many tags, but each tag belongs to one user.

**Many-to-many:** A note can have several tags, and a tag can be attached to several notes. The `note_tags` join table represents this relationship using two foreign keys. It avoids storing comma-separated tag names in a note and allows each tag to be managed independently.

## SQLite CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
    body TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_user_id_created_at
ON notes(user_id, created_at DESC);

CREATE INDEX idx_tags_user_id
ON tags(user_id);
```

## Example SQL queries

### 1. List one user's notes, newest first

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC;
```

### 2. Join notes to their owners

```sql
SELECT notes.title, users.name, users.email
FROM notes
JOIN users ON notes.user_id = users.id;
```

### 3. Find all tags attached to a particular note

```sql
SELECT tags.name
FROM tags
JOIN note_tags ON tags.id = note_tags.tag_id
WHERE note_tags.note_id = 10;
```

### 4. Count notes per user, including users with no notes

```sql
SELECT users.id, users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON users.id = notes.user_id
GROUP BY users.id, users.name;
```

## Index justification

The index on `(user_id, created_at DESC)` helps the common query that retrieves one user's notes ordered by newest first. It can reduce the rows the database must scan as the notes table grows. Indexes take additional storage and make writes slightly more expensive, so they should support real query patterns.

## Data integrity and security

Passwords are stored as secure password hashes, not plain text. The application must enforce ownership checks before reading, updating, or deleting notes and tags. Parameterised queries should be used for all user-supplied values.
