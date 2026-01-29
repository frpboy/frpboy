/* Quick Notes - Chrome Extension
 * Author: frpboy (https://github.com/frpboy)
 * Main UI controller for popup functionality
 */

class QuickNotesPopup {
  constructor() {
    this.currentNotes = [];
    this.currentEditingId = null;
    this.autoSaveTimer = null;
    this.init();
  }

  /**
   * Initialize the popup
   */
  async init() {
    this.cacheDOMElements();
    this.attachEventListeners();
    await this.loadNotes();
    this.updateStats();
  }

  /**
   * Cache DOM elements for better performance
   */
  cacheDOMElements() {
    // Input elements
    this.noteInput = document.querySelector('.note-input');
    this.searchInput = document.querySelector('.search-input');
    this.fileInput = document.querySelector('.file-input');
    
    // Display elements
    this.charCount = document.querySelector('.char-count');
    this.wordCount = document.querySelector('.word-count');
    this.notesList = document.querySelector('.notes-list');
    this.emptyState = document.querySelector('.notes-empty');
    
    // Action buttons
    this.saveBtn = document.querySelector('.btn-save');
    this.clearInputBtn = document.querySelector('.btn-clear-input');
    this.exportBtn = document.querySelector('.btn-export');
    this.importBtn = document.querySelector('.btn-import');
    this.clearAllBtn = document.querySelector('.btn-clear-all');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Input events
    this.noteInput.addEventListener('input', () => this.handleInputChange());
    this.searchInput.addEventListener('input', () => this.handleSearch());
    
    // Button events
    this.saveBtn.addEventListener('click', () => this.saveCurrentNote());
    this.clearInputBtn.addEventListener('click', () => this.clearInput());
    this.exportBtn.addEventListener('click', () => this.exportNotes());
    this.importBtn.addEventListener('click', () => this.importNotes());
    this.clearAllBtn.addEventListener('click', () => this.clearAllNotes());
    
    // File input
    this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    
    // Auto-save on input
    this.noteInput.addEventListener('input', () => this.scheduleAutoSave());
  }

  /**
   * Handle input changes and update character/word counts
   */
  handleInputChange() {
    const text = this.noteInput.value;
    const chars = NotesUtils.countCharacters(text);
    const words = NotesUtils.countWords(text);
    
    this.charCount.textContent = `${chars} ${chars === 1 ? 'char' : 'chars'}`;
    this.wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    
    // Enable/disable save button
    this.saveBtn.disabled = text.trim() === '';
  }

  /**
   * Schedule auto-save after user stops typing
   */
  scheduleAutoSave() {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    // Set new timer (save after 1 second of inactivity)
    this.autoSaveTimer = setTimeout(() => {
      if (this.noteInput.value.trim() !== '') {
        this.saveCurrentNote();
      }
    }, 1000);
  }

  /**
   * Load and display notes
   */
  async loadNotes() {
    try {
      this.currentNotes = await notesStorage.loadNotes();
      this.renderNotes();
    } catch (error) {
      console.error('Quick Notes: Failed to load notes:', error);
      this.showError('Failed to load notes');
    }
  }

  /**
   * Render notes in the list
   */
  renderNotes() {
    const filteredNotes = this.filterNotes();
    
    if (filteredNotes.length === 0) {
      this.notesList.innerHTML = '';
      this.emptyState.classList.add('show');
      return;
    }
    
    this.emptyState.classList.remove('show');
    
    this.notesList.innerHTML = filteredNotes.map(note => this.createNoteHTML(note)).join('');
    
    // Attach event listeners to note actions
    this.attachNoteEventListeners();
  }

  /**
   * Filter notes based on search query
   */
  filterNotes() {
    const query = this.searchInput.value.toLowerCase();
    
    if (!query) {
      return this.currentNotes;
    }
    
    return this.currentNotes.filter(note => 
      note.content.toLowerCase().includes(query)
    );
  }

  /**
   * Handle search functionality
   */
  handleSearch() {
    this.renderNotes();
  }

  /**
   * Create HTML for a single note
   */
  createNoteHTML(note) {
    const timestampInfo = NotesUtils.getTimestampInfo(note.updatedAt);
    const preview = NotesUtils.truncateText(note.content, 150);
    
    return `
      <div class="note-item" data-id="${note.id}">
        <div class="note-content">${NotesUtils.escapeHtml(preview)}</div>
        <div class="note-meta">
          <span class="note-timestamp" title="${timestampInfo.full}">
            ${timestampInfo.relative}
          </span>
          <div class="note-actions">
            <button class="btn-icon edit" data-action="edit" data-id="${note.id}">Edit</button>
            <button class="btn-icon delete" data-action="delete" data-id="${note.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to note action buttons
   */
  attachNoteEventListeners() {
    const actionButtons = this.notesList.querySelectorAll('.btn-icon');
    
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        const noteId = e.target.getAttribute('data-id');
        
        if (action === 'edit') {
          this.editNote(noteId);
        } else if (action === 'delete') {
          this.deleteNote(noteId);
        }
      });
    });
  }

  /**
   * Edit a note (load it into the input field)
   */
  async editNote(noteId) {
    const note = this.currentNotes.find(n => n.id === noteId);
    
    if (!note) {
      this.showError('Note not found');
      return;
    }
    
    this.currentEditingId = noteId;
    this.noteInput.value = note.content;
    this.noteInput.focus();
    this.handleInputChange();
    
    // Update save button text
    this.saveBtn.textContent = 'Update Note';
  }

  /**
   * Delete a note with confirmation
   */
  async deleteNote(noteId) {
    const note = this.currentNotes.find(n => n.id === noteId);
    
    if (!note) {
      return;
    }
    
    const confirmed = await NotesUtils.showConfirmation(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      const success = await notesStorage.deleteNote(noteId);
      
      if (success) {
        // Clear input if we're deleting the currently editing note
        if (this.currentEditingId === noteId) {
          this.clearInput();
        }
        
        await this.loadNotes();
        this.updateStats();
      }
    } catch (error) {
      console.error('Quick Notes: Failed to delete note:', error);
      this.showError('Failed to delete note');
    }
  }

  /**
   * Save or update the current note
   */
  async saveCurrentNote() {
    const content = this.noteInput.value.trim();
    
    if (!content) {
      this.showError('Note cannot be empty');
      return;
    }
    
    try {
      let note;
      
      if (this.currentEditingId) {
        // Update existing note
        note = await notesStorage.updateNote(this.currentEditingId, content);
      } else {
        // Create new note
        note = await notesStorage.addNote({ content });
      }
      
      if (note) {
        this.clearInput();
        await this.loadNotes();
        this.updateStats();
        
        // Reset save button text
        this.saveBtn.textContent = 'Save Note';
      }
    } catch (error) {
      console.error('Quick Notes: Failed to save note:', error);
      this.showError('Failed to save note');
    }
  }

  /**
   * Clear the input field
   */
  clearInput() {
    this.noteInput.value = '';
    this.currentEditingId = null;
    this.handleInputChange();
    this.saveBtn.textContent = 'Save Note';
    
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }

  /**
   * Search notes
   */
  searchNotes() {
    this.renderNotes();
  }

  /**
   * Export all notes
   */
  async exportNotes() {
    try {
      const notes = await notesStorage.loadNotes();
      
      if (notes.length === 0) {
        this.showError('No notes to export');
        return;
      }
      
      // Use text format for better readability
      NotesUtils.exportToText(notes);
    } catch (error) {
      console.error('Quick Notes: Failed to export notes:', error);
      this.showError('Failed to export notes');
    }
  }

  /**
   * Import notes from a file
   */
  importNotes() {
    this.fileInput.click();
  }

  /**
   * Handle file import
   */
  async handleFileImport(event) {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    try {
      const content = await this.readFile(file);
      const notes = NotesUtils.parseImportedFile(content, file.name);
      
      if (notes.length === 0) {
        throw new Error('No valid notes found in file');
      }
      
      const importedCount = await notesStorage.importNotes(notes);
      
      // Clear file input
      this.fileInput.value = '';
      
      this.showSuccess(`Successfully imported ${importedCount} note${importedCount > 1 ? 's' : ''}`);
      await this.loadNotes();
      this.updateStats();
    } catch (error) {
      console.error('Quick Notes: Failed to import notes:', error);
      this.fileInput.value = '';
      this.showError(error.message || 'Failed to import notes');
    }
  }

  /**
   * Read file content
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Clear all notes with confirmation
   */
  async clearAllNotes() {
    const noteCount = this.currentNotes.length;
    
    if (noteCount === 0) {
      this.showError('No notes to clear');
      return;
    }
    
    const confirmed = await NotesUtils.showConfirmation(
      'Clear All Notes',
      `Are you sure you want to delete all ${noteCount} notes? This action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      await notesStorage.deleteAllNotes();
      this.clearInput();
      await this.loadNotes();
      this.updateStats();
      
      this.showSuccess('All notes cleared successfully');
    } catch (error) {
      console.error('Quick Notes: Failed to clear all notes:', error);
      this.showError('Failed to clear all notes');
    }
  }

  /**
   * Update statistics display
   */
  async updateStats() {
    try {
      const stats = await notesStorage.getStats();
      
      // Update button states
      const hasNotes = stats.totalNotes > 0;
      this.exportBtn.disabled = !hasNotes;
      this.clearAllBtn.disabled = !hasNotes;
    } catch (error) {
      console.error('Quick Notes: Failed to update stats:', error);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      
      if (!this.saveBtn.disabled) {
        this.saveCurrentNote();
      }
    }
    
    // Escape to clear input
    if (event.key === 'Escape') {
      if (this.noteInput.value) {
        this.clearInput();
      }
    }
    
    // Ctrl/Cmd + F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.searchInput.focus();
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Simple error display (in a real app, you'd use a proper notification system)
    console.error('Quick Notes Error:', message);
    
    // Visual feedback
    const originalBorder = this.noteInput.style.borderColor;
    this.noteInput.style.borderColor = '#f44336';
    
    setTimeout(() => {
      this.noteInput.style.borderColor = originalBorder;
    }, 2000);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    console.log('Quick Notes:', message);
    
    // Visual feedback
    const originalBorder = this.noteInput.style.borderColor;
    this.noteInput.style.borderColor = '#4caf50';
    
    setTimeout(() => {
      this.noteInput.style.borderColor = originalBorder;
    }, 1000);
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new QuickNotesPopup();
});
