/* Quick Notes - Chrome Extension
 * Author: frpboy (https://github.com/frpboy)
 * Storage management for saving, loading, and manipulating notes
 */

class NotesStorage {
  constructor() {
    this.storageKey = 'quick-notes-data';
  }

  /**
   * Save notes to Chrome local storage
   * @param {Array} notes - Array of note objects
   * @returns {Promise<void>}
   */
  async saveNotes(notes) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: notes });
    } catch (error) {
      console.error('Quick Notes: Failed to save notes:', error);
      throw new Error('Failed to save notes to storage');
    }
  }

  /**
   * Load notes from Chrome local storage
   * @returns {Promise<Array>} Array of note objects
   */
  async loadNotes() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('Quick Notes: Failed to load notes:', error);
      return [];
    }
  }

  /**
   * Add a new note
   * @param {Object} note - Note object with content
   * @returns {Promise<Object>} The saved note with id and timestamps
   */
  async addNote(note) {
    const notes = await this.loadNotes();
    const newNote = {
      id: this.generateId(),
      content: note.content.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    notes.unshift(newNote);
    await this.saveNotes(notes);
    return newNote;
  }

  /**
   * Update an existing note
   * @param {string} id - Note ID
   * @param {string} content - New content
   * @returns {Promise<Object|null>} Updated note or null if not found
   */
  async updateNote(id, content) {
    const notes = await this.loadNotes();
    const index = notes.findIndex(note => note.id === id);
    
    if (index === -1) {
      return null;
    }
    
    notes[index] = {
      ...notes[index],
      content: content.trim(),
      updatedAt: Date.now()
    };
    
    await this.saveNotes(notes);
    return notes[index];
  }

  /**
   * Delete a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteNote(id) {
    const notes = await this.loadNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    
    if (filteredNotes.length === notes.length) {
      return false;
    }
    
    await this.saveNotes(filteredNotes);
    return true;
  }

  /**
   * Delete all notes
   * @returns {Promise<void>}
   */
  async deleteAllNotes() {
    await this.saveNotes([]);
  }

  /**
   * Import notes from a file
   * @param {Array} importedNotes - Array of notes to import
   * @returns {Promise<number>} Number of notes imported
   */
  async importNotes(importedNotes) {
    if (!Array.isArray(importedNotes)) {
      throw new Error('Invalid import format: expected an array');
    }

    const existingNotes = await this.loadNotes();
    const validNotes = importedNotes
      .filter(note => note && note.content && typeof note.content === 'string')
      .map(note => ({
        id: this.generateId(),
        content: note.content.trim(),
        createdAt: note.createdAt || Date.now(),
        updatedAt: note.updatedAt || Date.now()
      }));

    const mergedNotes = [...validNotes, ...existingNotes];
    await this.saveNotes(mergedNotes);
    return validNotes.length;
  }

  /**
   * Search notes by content
   * @param {string} query - Search query
   * @returns {Promise<Array>} Filtered notes
   */
  async searchNotes(query) {
    const notes = await this.loadNotes();
    
    if (!query || query.trim() === '') {
      return notes;
    }
    
    const searchTerm = query.toLowerCase();
    return notes.filter(note => 
      note.content.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Generate unique ID for notes
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get note statistics
   * @returns {Promise<Object>} Object with total notes and total characters
   */
  async getStats() {
    const notes = await this.loadNotes();
    const totalChars = notes.reduce((sum, note) => sum + note.content.length, 0);
    
    return {
      totalNotes: notes.length,
      totalCharacters: totalChars
    };
  }
}

// Initialize storage instance
const notesStorage = new NotesStorage();
