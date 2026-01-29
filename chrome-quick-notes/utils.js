/* Quick Notes - Chrome Extension
 * Author: frpboy (https://github.com/frpboy)
 * Utility functions for timestamps, exports, imports, and text analysis
 */

class NotesUtils {
  /**
   * Format timestamp to readable string
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string} Formatted date string
   */
  static formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  /**
   * Get detailed timestamp information
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {Object} Object with short and full date strings
   */
  static getTimestampInfo(timestamp) {
    const date = new Date(timestamp);
    
    return {
      relative: this.formatTimestamp(timestamp),
      full: date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Count characters in text
   * @param {string} text - Text to analyze
   * @returns {number} Character count
   */
  static countCharacters(text) {
    return text ? text.length : 0;
  }

  /**
   * Count words in text
   * @param {string} text - Text to analyze
   * @returns {number} Word count
   */
  static countWords(text) {
    if (!text || text.trim() === '') {
      return 0;
    }
    // Remove extra spaces and split by whitespace
    const words = text.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;
  }

  /**
   * Truncate text to a maximum length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  static truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substr(0, maxLength).trim() + '...';
  }

  /**
   * Export notes as a JSON file
   * @param {Array} notes - Array of note objects
   * @returns {void}
   */
  static exportToJSON(notes) {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        application: 'Quick Notes by frpboy',
        version: '1.0.0',
        notes: notes
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      this.downloadFile(blob, `quick-notes-backup-${Date.now()}.json`);
    } catch (error) {
      console.error('Quick Notes: Failed to export JSON:', error);
      throw new Error('Failed to export notes');
    }
  }

  /**
   * Export notes as a plain text file
   * @param {Array} notes - Array of note objects
   * @returns {void}
   */
  static exportToText(notes) {
    try {
      let content = `QUICK NOTES EXPORT\n`;
      content += `==================\n\n`;
      content += `Generated: ${new Date().toLocaleString('en-US')}\n`;
      content += `Application: Quick Notes by frpboy\n`;
      content += `Total Notes: ${notes.length}\n\n`;
      content += `==================\n\n`;
      
      notes.forEach((note, index) => {
        const timestampInfo = this.getTimestampInfo(note.updatedAt);
        content += `NOTE #${index + 1}\n`;
        content += `Created: ${new Date(note.createdAt).toLocaleString('en-US')}\n`;
        content += `Last Edited: ${timestampInfo.full}\n`;
        content += `Characters: ${note.content.length}\n`;
        content += `Words: ${this.countWords(note.content)}\n`;
        content += `---\n`;
        content += `${note.content}\n\n`;
        content += `==================\n\n`;
      });
      
      const blob = new Blob([content], {
        type: 'text/plain;charset=utf-8'
      });
      
      this.downloadFile(blob, `quick-notes-${Date.now()}.txt`);
    } catch (error) {
      console.error('Quick Notes: Failed to export text:', error);
      throw new Error('Failed to export notes');
    }
  }

  /**
   * Download a file to the user's device
   * @param {Blob} blob - File blob
   * @param {string} filename - File name
   * @returns {void}
   */
  static downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Parse imported file content
   * @param {string} content - File content
   * @param {string} filename - Original file name
   * @returns {Array} Array of notes
   */
  static parseImportedFile(content, filename) {
    try {
      // Try JSON first
      if (filename.endsWith('.json')) {
        const data = JSON.parse(content);
        
        // Check if it's our export format
        if (data.notes && Array.isArray(data.notes)) {
          return data.notes;
        }
        
        // Otherwise, return as single note
        return [{
          content: content,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }];
      }
      
      // For text files, try to parse multiple notes
      if (filename.endsWith('.txt')) {
        // Try to detect if it's our export format
        if (content.includes('==================') && content.includes('NOTE #')) {
          return this.parseTextExport(content);
        }
        
        // Otherwise, treat as single note
        return [{
          content: content,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }];
      }
      
      // Default: treat as single note
      return [{
        content: content,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
    } catch (error) {
      console.error('Quick Notes: Failed to parse imported file:', error);
      throw new Error('Invalid file format');
    }
  }

  /**
   * Parse our custom text export format
   * @param {string} content - Text content
   * @returns {Array} Array of notes
   */
  static parseTextExport(content) {
    const notes = [];
    const noteBlocks = content.split('==================');
    
    noteBlocks.forEach(block => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock || !trimmedBlock.startsWith('NOTE #')) {
        return;
      }
      
      const lines = trimmedBlock.split('\n');
      let noteContent = '';
      let inContent = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line === '---') {
          inContent = true;
          continue;
        }
        
        if (inContent && line === '') {
          break;
        }
        
        if (inContent) {
          noteContent += line + '\n';
        }
      }
      
      if (noteContent.trim()) {
        notes.push({
          content: noteContent.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });
    
    return notes;
  }

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @returns {Promise<boolean>} User confirmation
   */
  static async showConfirmation(title, message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog show';
      
      dialog.innerHTML = `
        <div class="confirmation-content">
          <h3 class="confirmation-title">${title}</h3>
          <p class="confirmation-message">${message}</p>
          <div class="confirmation-buttons">
            <button class="btn btn-cancel" data-action="cancel">Cancel</button>
            <button class="btn btn-clear-all" data-action="confirm">Confirm</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const handleClick = (e) => {
        const action = e.target.getAttribute('data-action');
        document.body.removeChild(dialog);
        
        if (action === 'confirm') {
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      dialog.addEventListener('click', handleClick);
    });
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
