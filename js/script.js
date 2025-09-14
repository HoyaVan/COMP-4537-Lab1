import { MESSAGES } from "../lang/messages/en/user.js";

const MIN_CHAR_WRITE = 0;
const MAX_CHAR_WRITE = 100;

// ----- Storage helper -----
class StorageManager {
    static KEY = "lab1_notes";

    static load() {
        try { return JSON.parse(localStorage.getItem(StorageManager.KEY) || "[]"); }
        catch { return []; }
    }

    static save(notesArray) {
        localStorage.setItem(StorageManager.KEY, JSON.stringify(notesArray));
        localStorage.setItem(StorageManager.KEY + "_savedAt", new Date().toISOString());
    }

    static savedAtISO() {
        return localStorage.getItem(StorageManager.KEY + "_savedAt");
    }

    static formatMessage(template, args = {}) {
        return String(template ?? "").replace(/\{(\w+)\}/g, (_, k) => (args[k] ?? ""));
    }
}

// ----- Writer app -----
class WriterApp {
    constructor() {
        this.container = document.getElementById("notesContainer");
        this.addBtn = document.getElementById("addBtn");
        this.backBtn = document.getElementById("backBtn");
        this.timeEl = document.getElementById("writerTime");
        this.timeLabel = document.getElementById("writerTimeLabel");
        this.titleEl = document.getElementById("writerTitle");

        this.notes = StorageManager.load(); // notes is an array of { id, text }
        this.changed = false; // track if changes happened

        this.applyMessages();
        this.renderAll();
        this.bindEvents();

        // auto-save every 2 seconds (per lab spec)
        this.timer = setInterval(() => this.autoSaveTick(), 2000);

        // clear interval when leaving page
        window.addEventListener("beforeunload", () => clearInterval(this.timer));

        // also reflect last saved time on load
        this.updateSavedTimeUI();
    }

    applyMessages() {
        if (this.titleEl) {
            this.titleEl.textContent = MESSAGES.WRITER_TITLE;
            document.title = MESSAGES.WRITER_TITLE; 
        }
        if (this.timeLabel) this.timeLabel.textContent = MESSAGES.WRITER_TIME_TABLE;
        if (this.addBtn) this.addBtn.textContent = MESSAGES.ADD_BUTTON;
        if (this.backBtn) this.backBtn.textContent = MESSAGES.BACK_BUTTON;
    }

    bindEvents() {
        if (this.addBtn) this.addBtn.addEventListener("click", () => this.addNote());
        if (this.backBtn) this.backBtn.addEventListener("click", () => { window.location.href = "index.html"; });
    }

    addNote(text = "") {
        if (this.notes.length >= MAX_CHAR_WRITE) {
            alert(formatMessage(MESSAGES.RANGE, { min: MIN_CHAR_WRITE, max: MAX_CHAR_WRITE }));
            return;
        }

        const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
        this.notes.push({ id, text });
        this.changed = true;
        this.renderNote({ id, text });
    }

    removeNote(id) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.changed = true;

        const row = document.querySelector(`.note-row[data-id="${id}"]`);
        if (row?.parentNode) row.parentNode.removeChild(row);

        StorageManager.save(this.notes);
        this.updateSavedTimeUI();
        this.changed = false;
    }

    handleTextInput(id, value) {
        const note = this.notes.find(n => n.id === id);
        if (note) { note.text = value; this.changed = true; }
    }

    autoSaveTick() {
        if (!this.changed) return;
        StorageManager.save(this.notes);
        this.updateSavedTimeUI();
        this.changed = false;
    }

    updateSavedTimeUI() {
        const iso = StorageManager.savedAtISO();
        if (this.timeEl) this.timeEl.textContent = iso ? new Date(iso).toLocaleString() : "";
    }

    renderAll() {
        if (!this.container) return;
        this.container.innerHTML = "";
        this.notes.forEach(n => this.renderNote(n));
    }

    renderNote({ id, text }) {
        const row = document.createElement("div");
        row.className = "note-row";
        row.dataset.id = id;

        const ta = document.createElement("textarea");
        ta.value = text || "";
        ta.addEventListener("input", e => this.handleTextInput(id, e.target.value));

        const rm = document.createElement("button");
        rm.textContent = MESSAGES.REMOVE_BUTTON;
        rm.addEventListener("click", () => this.removeNote(id));

        row.appendChild(ta);
        row.appendChild(rm);
        this.container.appendChild(row);
    }
}

// ----- Reader app -----
class ReaderApp {
    constructor() {
        this.container = document.getElementById("readContainer");
        this.backBtn = document.getElementById("backBtn");
        this.timeEl = document.getElementById("readerTime");
        this.timeLabel = document.getElementById("readerTimeLabel");
        this.titleEl = document.getElementById("readerTitle");

        this.applyMessages();
        this.bindEvents();
        this.render();

        this.timer = setInterval(() => this.render(), 2000);

        // clear interval when leaving page
        window.addEventListener("beforeunload", () => clearInterval(this.timer));
    }

    applyMessages() {
        if (this.titleEl) this.titleEl.textContent = MESSAGES.READER_TITLE;
        if (this.timeLabel) this.timeLabel.textContent = MESSAGES.READER_TIME_TABLE;
        if (this.backBtn) this.backBtn.textContent = MESSAGES.BACK_BUTTON;
    }

    bindEvents() {
        if (this.backBtn) this.backBtn.addEventListener("click", () => { window.location.href = "index.html"; });
    }

    render() {
        const notes = StorageManager.load();
        const iso = StorageManager.savedAtISO();
        if (this.timeEl) this.timeEl.textContent = iso ? new Date(iso).toLocaleString() : "";

        if (!this.container) return;
        this.container.innerHTML = "";
        notes.forEach(n => {
            const div = document.createElement("div");
            div.className = "note";
            div.textContent = n.text || "";
            this.container.appendChild(div);
        });
    }
}

// ----- Index wiring -----
function wireIndex() {
    const title = document.getElementById("indexTitle");
    if (title) title.textContent = MESSAGES.INDEX_TITLE;

    const writerBtn = document.getElementById("writerBtn");
    if (writerBtn) {
        writerBtn.textContent = MESSAGES.WRITER_REDIRECT_BUTTON;
        writerBtn.addEventListener("click", () => { window.location.href = "writer.html"; });
    }

    const readerBtn = document.getElementById("readerBtn");
    if (readerBtn) {
        readerBtn.textContent = MESSAGES.READER_REDIRECT_BUTTON;
        readerBtn.addEventListener("click", () => { window.location.href = "reader.html"; });
    }
}

// ----- page -----
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.getAttribute("data-page");
    if (page === "index") wireIndex();
    if (page === "writer") new WriterApp();
    if (page === "reader") new ReaderApp();
});