// CSS Applier - Applies CSS changes to files
import * as fs from 'fs';
import { UndoEntry } from '../../shared/types';

export class CSSApplier {
    private undoStack: UndoEntry[] = [];
    private maxUndoSize = 50;

    /**
     * Apply CSS changes to an HTML file
     * This will either modify existing <style> blocks or create new ones
     */
    async applyCSS(htmlFilePath: string, selector: string, cssChanges: string): Promise<boolean> {
        try {
            // Read the HTML file
            let content = fs.readFileSync(htmlFilePath, 'utf-8');

            // Save for undo
            this.pushUndo({
                filePath: htmlFilePath,
                oldContent: content,
                newContent: '', // Will be set after modification
                timestamp: Date.now()
            });

            // Check if there's a <style> block
            const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            
            if (styleMatch) {
                // Update existing style block
                content = this.injectCSSRule(content, selector, cssChanges);
            } else {
                // Create new style block
                content = this.addStyleBlock(content, selector, cssChanges);
            }

            // Save changes
            fs.writeFileSync(htmlFilePath, content, 'utf-8');

            // Update undo entry with new content
            const lastEntry = this.undoStack[this.undoStack.length - 1];
            if (lastEntry) {
                lastEntry.newContent = content;
            }

            return true;
        } catch (error) {
            console.error('Failed to apply CSS:', error);
            return false;
        }
    }

    /**
     * Inject CSS rule into existing style block
     */
    private injectCSSRule(htmlContent: string, selector: string, cssChanges: string): string {
        // Escape special regex characters in selector
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Try to find existing rule for this selector
        const selectorRegex = new RegExp(`(${escapedSelector})\\s*\\{([^}]*)\\}`, 'i');
        const match = htmlContent.match(selectorRegex);

        if (match) {
            // Update existing rule
            const existingStyles = match[2].trim();
            const newStyles = this.mergeStyles(existingStyles, cssChanges);
            return htmlContent.replace(
                selectorRegex,
                `${selector} { ${newStyles} }`
            );
        } else {
            // Add new rule to first style block - preserve existing styles!
            return htmlContent.replace(
                /(<style[^>]*>)([\s\S]*?)(<\/style>)/i,
                (fullMatch, openTag, innerStyles, closeTag) => {
                    return `${openTag}\n${innerStyles}\n  ${selector} { ${cssChanges} }\n${closeTag}`;
                }
            );
        }
    }

    /**
     * Merge existing styles with new ones
     */
    private mergeStyles(existing: string, newStyles: string): string {
        const stylesMap = new Map<string, string>();
        
        // Parse existing styles
        existing.split(';').forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
                stylesMap.set(property, value);
            }
        });

        // Parse new styles
        newStyles.split(';').forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
                stylesMap.set(property, value);
            }
        });

        // Convert back to string
        return Array.from(stylesMap.entries())
            .map(([property, value]) => `${property}: ${value}`)
            .join('; ');
    }

    /**
     * Add a new style block to the HTML
     */
    private addStyleBlock(htmlContent: string, selector: string, cssChanges: string): string {
        const styleBlock = `<style>
  ${selector} { ${cssChanges} }
</style>`;
        
        // Insert before </head> or </body> or at end
        if (htmlContent.includes('</head>')) {
            return htmlContent.replace('</head>', `${styleBlock}\n</head>`);
        } else if (htmlContent.includes('</body>')) {
            return htmlContent.replace('</body>', `${styleBlock}\n</body>`);
        } else {
            return htmlContent + styleBlock;
        }
    }

    /**
     * Undo last change
     */
    async undo(): Promise<boolean> {
        const entry = this.undoStack.pop();
        if (!entry) {
            return false;
        }

        try {
            fs.writeFileSync(entry.filePath, entry.oldContent, 'utf-8');
            return true;
        } catch (error) {
            console.error('Failed to undo:', error);
            return false;
        }
    }

    /**
     * Push undo entry
     */
    private pushUndo(entry: UndoEntry): void {
        this.undoStack.push(entry);
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Clear undo stack
     */
    clearUndoStack(): void {
        this.undoStack = [];
    }
}
