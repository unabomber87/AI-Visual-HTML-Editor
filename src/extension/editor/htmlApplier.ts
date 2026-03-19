// HTML Applier - Applies HTML changes to files
import * as fs from 'fs';
import { UndoEntry } from '../../shared/types';

export type HTMLChangeType = 'replace' | 'append' | 'prepend' | 'setAttribute';

export class HTMLApplier {
    private undoStack: UndoEntry[] = [];
    private maxUndoSize = 50;

    /**
     * Apply HTML changes to an element
     */
    async applyHTML(
        htmlFilePath: string,
        selector: string,
        htmlChanges: string,
        changeType: HTMLChangeType
    ): Promise<boolean> {
        try {
            let content = fs.readFileSync(htmlFilePath, 'utf-8');

            // Save for undo
            this.pushUndo({
                filePath: htmlFilePath,
                oldContent: content,
                newContent: '',
                timestamp: Date.now()
            });

            // Find and modify the element
            content = this.modifyElement(content, selector, htmlChanges, changeType);

            // Save changes
            fs.writeFileSync(htmlFilePath, content, 'utf-8');

            // Update undo entry
            const lastEntry = this.undoStack[this.undoStack.length - 1];
            if (lastEntry) {
                lastEntry.newContent = content;
            }

            return true;
        } catch (error) {
            console.error('Failed to apply HTML:', error);
            return false;
        }
    }

    /**
     * Determine change type based on instruction
     */
    determineChangeType(instruction: string): HTMLChangeType {
        const lowerInstruction = instruction.toLowerCase();
        
        if (lowerInstruction.includes('remplacer') || lowerInstruction.includes('replace')) {
            return 'replace';
        }
        if (lowerInstruction.includes('ajouter au début') || lowerInstruction.includes('prepend') || lowerInstruction.includes('ajouter avant')) {
            return 'prepend';
        }
        if (lowerInstruction.includes('ajouter') || lowerInstruction.includes('append') || lowerInstruction.includes('ajouter après')) {
            return 'append';
        }
        if (lowerInstruction.includes('attribut') || lowerInstruction.includes('src=') || lowerInstruction.includes('class=') || lowerInstruction.includes('id=')) {
            return 'setAttribute';
        }
        
        // Default to replace
        return 'replace';
    }

    /**
     * Extract tag name from CSS selector
     * e.g., "div.header" -> "div", "#myId" -> "div", ".myClass" -> "div"
     * Also handles complex selectors like "div > span.class" -> "span"
     */
    private extractTagName(selector: string, htmlContent: string): string | null {
        // Strategy: find the last element in the selector chain (after last >)
        const lastPart = selector.split('>').pop()?.trim() || selector;
        
        // Remove pseudo-classes and pseudo-elements like :nth-child(1), :hover, ::before, etc.
        const cleanPart = lastPart.replace(/::?[a-zA-Z-]+\([^)]*\)/g, '').replace(/:[a-zA-Z-]+/g, '');
        
        // First, try to extract tag name from the cleaned selector
        const tagMatch = cleanPart.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
        if (tagMatch) {
            return tagMatch[1].toLowerCase();
        }
        
        // If no tag name, try to find the element in HTML by ID or class
        const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
        const classMatch = selector.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g);
        
        if (idMatch) {
            // Search for element with this ID in HTML
            const idRegex = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)[^>]*\\sid=["']${idMatch[1]}["'][^>]*>`, 'i');
            const match = htmlContent.match(idRegex);
            if (match) {
                return match[1].toLowerCase();
            }
        }
        
        if (classMatch && classMatch.length > 0) {
            // Search for element with these classes in HTML - try each class from last to first
            for (let i = classMatch.length - 1; i >= 0; i--) {
                const className = classMatch[i].replace('.', '');
                if (className && !className.includes(':')) { // Skip pseudo-classes
                    const classRegex = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)[^>]*\\sclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i');
                    const match = htmlContent.match(classRegex);
                    if (match) {
                        return match[1].toLowerCase();
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Find matching closing tag position by counting nested tags
     */
    private findClosingTagPosition(htmlContent: string, openTagStart: number, tagName: string): number {
        const escapedTagName = tagName.toLowerCase();
        const openTagEnd = htmlContent.indexOf('>', openTagStart);
        if (openTagEnd === -1) return -1;

        let searchPos = openTagEnd + 1;
        let depth = 0;

        while (searchPos < htmlContent.length) {
            // Check for opening tag
            const openMatch = new RegExp(
                `<${escapedTagName}[\\s>]`,
                'i'
            ).exec(htmlContent.substring(searchPos));

            // Check for closing tag
            const closeMatch = new RegExp(
                `</${escapedTagName}>`,
                'i'
            ).exec(htmlContent.substring(searchPos));

            if (!closeMatch) break;

            if (openMatch && openMatch.index < closeMatch.index) {
                depth++;
                searchPos += openMatch.index + openMatch[0].length;
            } else {
                if (depth === 0) {
                    // Found the matching closing tag
                    return searchPos + closeMatch.index;
                }
                depth--;
                searchPos += closeMatch.index + closeMatch[0].length;
            }
        }

        return -1;
    }

    /**
     * Replace inner HTML of an element
     */
    private replaceInnerHTML(htmlContent: string, selector: string, newContent: string): string {
        const tagName = this.extractTagName(selector, htmlContent);
        if (!tagName) return htmlContent;

        // Find all opening tags matching the selector
        const regex = new RegExp(`<${tagName}[^>]*>`, 'gi');
        let match;
        let lastValidMatch: { start: number; end: number } | null = null;

        while ((match = regex.exec(htmlContent)) !== null) {
            const openTagStart = match.index;
            const openTagEnd = htmlContent.indexOf('>', openTagStart);
            
            if (openTagEnd === -1) continue;

            // Find the matching closing tag
            const closeTagPos = this.findClosingTagPosition(htmlContent, openTagStart, tagName);
            
            if (closeTagPos !== -1) {
                // Found a complete tag pair
                const oldContent = htmlContent.substring(openTagEnd + 1, closeTagPos);
                
                // Replace this element's content
                return (
                    htmlContent.substring(0, openTagEnd + 1) +
                    newContent +
                    htmlContent.substring(closeTagPos)
                );
            }
        }

        return htmlContent;
    }

    /**
     * Modify element based on selector and change type
     */
    private modifyElement(
        htmlContent: string,
        selector: string,
        htmlChanges: string,
        changeType: string
    ): string {
        // Get the tag name from selector
        const tagName = this.extractTagName(selector, htmlContent);
        
        if (!tagName) {
            console.error('[HTMLApplier] Could not extract tag name from selector:', selector);
            return htmlContent;
        }

        // Escape special regex characters in tag name
        const escapedTagName = this.escapeRegex(tagName);

        switch (changeType) {
            case 'replace':
                return this.replaceInnerHTML(htmlContent, selector, htmlChanges);

            case 'append':
                // For append, replace inner and then append
                const tagNameForAppend = this.extractTagName(selector, htmlContent);
                if (!tagNameForAppend) return htmlContent;
                
                const appendRegex = new RegExp(`(<${this.escapeRegex(tagNameForAppend)}[^>]*>)([\\s\\S]*?)(</${this.escapeRegex(tagNameForAppend)}>)`, 'i');
                return htmlContent.replace(
                    appendRegex,
                    (match, openTag, inner, closeTag) => {
                        if (!openTag || !closeTag) return match;
                        return openTag + inner + htmlChanges + closeTag;
                    }
                );

            case 'prepend':
                // For prepend, replace inner and then prepend
                const tagNameForPrepend = this.extractTagName(selector, htmlContent);
                if (!tagNameForPrepend) return htmlContent;
                
                const prependRegex = new RegExp(`(<${this.escapeRegex(tagNameForPrepend)}[^>]*>)([\\s\\S]*?)(</${this.escapeRegex(tagNameForPrepend)}>)`, 'i');
                return htmlContent.replace(
                    prependRegex,
                    (match, openTag, inner, closeTag) => {
                        if (!openTag || !closeTag) return match;
                        return openTag + htmlChanges + inner + closeTag;
                    }
                );

            case 'setAttribute':
                // Set or modify an attribute
                const tagNameForAttr = this.extractTagName(selector, htmlContent);
                if (!tagNameForAttr) return htmlContent;
                
                const [attrName, attrValue] = htmlChanges.split('=').map(s => s.trim());
                return htmlContent.replace(
                    new RegExp(`(<${this.escapeRegex(tagNameForAttr)})([^>]*)>`, 'i'),
                    (match, openTag, attrs) => {
                        // Check if attribute exists
                        if (attrs && attrName && attrs.includes(attrName)) {
                            // Replace existing attribute
                            return match.replace(
                                new RegExp(`${this.escapeRegex(attrName)}=["'][^"']*["']`),
                                `${attrName}="${attrValue}"`
                            );
                        } else {
                            // Add new attribute
                            return `${openTag} ${attrName}="${attrValue}"${attrs}>`;
                        }
                    }
                );

            default:
                return htmlContent;
        }
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Push undo entry
     */
    private pushUndo(entry: UndoEntry): void {
        this.undoStack.push(entry);
        if (this.undoStack.length > this.maxUndoSize) {
            this.undoStack.shift();
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
