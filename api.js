const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const noteForm = document.querySelector("#note-form"); 
const titleInput = document.querySelector("#title-input"); 
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

let notes = [];

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status";
    if (type) {
        statusMessage.classList.add(type);
    }
}

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    // JSONPlaceholder may return an empty body for DELETE (204), so only parse
    // JSON when a response body is present.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const data = await response.json();
    return { data, status: response.status };
}

function renderNotes(list) {
    notesList.replaceChildren();

    if (list.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-state";
        emptyItem.textContent = "No notes to display. Load notes or create one.";
        notesList.appendChild(emptyItem);
        return;
    }

    list.forEach((note) => {
        const item = document.createElement("li");
        item.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title || "Untitled note";

        const body = document.createElement("p");
        body.textContent = note.body || "No body provided.";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteNote(note.id, deleteButton));

        item.append(title, body, deleteButton);
        notesList.appendChild(item);
    });
}

async function loadNotes() {
    loadButton.disabled = true;
    setStatus("Loading notes...");

    try {
        const result = await request(`${API_URL}?_limit=10`);
        notes = Array.isArray(result.data) ? result.data : [];
        renderNotes(notes);

        if (notes.length === 0) {
            setStatus("The server returned no notes.", "success");
        } else {
            setStatus(`Loaded ${notes.length} notes from the server.`, "success");
        }
    } catch (error) {
        setStatus("Could not load notes. Check your connection and try again.", "error");
        console.error(error);
    } finally {
        loadButton.disabled = false;
    }
}

async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        setStatus("Please enter a title.", "error");
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        setStatus("The title must be 100 characters or fewer.", "error");
        titleInput.focus();
        return;
    }

    submitButton.disabled = true;
    setStatus("Creating note...");

    try {
        const result = await request(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify({ title, body, userId: 1 })
        });

        const createdNote = result.data;
        // JSONPlaceholder simulates POST responses but does not persist them.
        // Keep the returned note in this page's local array for the current session.
        notes = [{ ...createdNote, title, body }, ...notes];
        renderNotes(notes);
        noteForm.reset();
        setStatus(`Note created (status ${result.status}, id ${createdNote.id}).`, "success");
    } catch (error) {
        setStatus("Could not create the note. Please try again.", "error");
        console.error(error);
    } finally {
        submitButton.disabled = false;
    }
}

async function deleteNote(noteId, button) {
    button.disabled = true;
    setStatus("Deleting note...");

    try {
        const result = await request(`${API_URL}/${encodeURIComponent(noteId)}`, {
            method: "DELETE"
        });

        // JSONPlaceholder does not actually store or delete data permanently.
        // Remove the note from this page's local list after its simulated DELETE succeeds.
        notes = notes.filter((note) => String(note.id) !== String(noteId));
        renderNotes(notes);
        setStatus(`Note deleted (status ${result.status}).`, "success");
    } catch (error) {
        setStatus("Could not delete the note. Please try again.", "error");
        console.error(error);
    } finally {
        // The item may have been removed from the DOM, but re-enabling is safe.
        button.disabled = false;
    }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

// Show a useful empty state before the first request.
renderNotes(notes);
