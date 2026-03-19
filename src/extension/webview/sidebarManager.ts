// Sidebar Manager - Handles the AI prompt sidebar
import * as vscode from 'vscode';
import { ElementData, ExtensionToWebviewMessage } from '../../shared/types';

export class SidebarManager {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel | undefined;
    private messageHandler: ((message: any) => void) | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Show the sidebar with the prompt for an element
     */
    public showPrompt(elementData: ElementData): vscode.WebviewPanel {
        // If panel exists, just reveal it with new content
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            this.updateContent(elementData);
            return this.panel;
        }

        // Create new sidebar panel
        this.panel = vscode.window.createWebviewPanel(
            'aiVisualEditorPrompt',
            'AI Visual Editor',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set initial content
        this.updateContent(elementData);

        // Handle messages from sidebar
        this.panel.webview.onDidReceiveMessage(async (message: any) => {
            if (this.messageHandler) {
                this.messageHandler(message);
            }
        });

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        return this.panel;
    }

    /**
     * Update sidebar content with element info
     */
    private updateContent(elementData: ElementData): void {
        if (!this.panel) return;

        this.panel.webview.html = this.getSidebarHtml(elementData);
    }

    /**
     * Format the hierarchy into HTML parts
     */
    private formatHierarchy(selector: string): string {
        // Split the selector into parts
        const parts = selector.split(' > ');
        
        let html = '';
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            
            if (i > 0) {
                html += '<div class="hierarchy-separator">▶</div>';
            }
            
            html += `<div class="hierarchy-part">${this.escapeHtml(part)}</div>`;
        }
        
        return html;
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    }

    /**
     * Get HTML for the sidebar
     */
    private getSidebarHtml(elementData: ElementData): string {
        // Store element data globally so it can be accessed by apply()
        const elementDataJson = JSON.stringify(elementData);
        
        // Format the hierarchy selector
        const hierarchyHtml = this.formatHierarchy(elementData.cssSelector || '');
        
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            margin: 0;
            background: #1e1e1e;
            color: #cccccc;
        }
        h2 {
            margin-top: 0;
            font-size: 18px;
            color: #ffffff;
            margin-bottom: 15px;
        }
        .element-info {
            background: #2d2d2d;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border: 1px solid #3c3c3c;
        }
        .element-info-title {
            font-size: 12px;
            color: #888;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .element-hierarchy {
            margin-bottom: 10px;
        }
        .hierarchy-part {
            display: inline-block;
            font-size: 14px;
            padding: 4px 8px;
            background: #3c3c3c;
            border-radius: 4px;
            margin: 2px;
            color: #4fc1ff;
        }
        .hierarchy-part:first-child {
            margin-left: 0;
        }
        .hierarchy-separator {
            display: inline;
            color: #666;
            margin: 0 4px;
            font-size: 12px;
        }
        .element-tag {
            font-size: 14px;
            font-weight: bold;
            color: #4fc1ff;
            margin-bottom: 8px;
        }
        .element-details {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }
        .detail-badge {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: #3c3c3c;
        }
        .detail-badge.id {
            color: #9cdcfe;
        }
        .detail-badge.class {
            color: #ce9178;
        }
        .element-selector-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .element-selector {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            color: #b5cea8;
            word-break: break-all;
            background: #1e1e1e;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #3c3c3c;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #ffffff;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #3c3c3c;
            border-radius: 4px;
            background: #2d2d2d;
            color: #cccccc;
            font-size: 14px;
            resize: vertical;
            min-height: 80px;
            box-sizing: border-box;
            font-family: inherit;
        }
        textarea:focus {
            outline: none;
            border-color: #007acc;
        }
        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .cancel-btn {
            background: #6c757d;
            color: white;
        }
        .apply-btn {
            background: #28a745;
            color: white;
        }
        button:hover {
            opacity: 0.9;
        }
        .hint {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h2>🎨 AI Visual Editor</h2>
    
    <div class="element-info">
        <div class="element-info-title">Selected Element</div>
        
        <!-- Full Hierarchy Selector -->
        <div class="element-selector-label">CSS Selector (Unique Path)</div>
        <div class="element-selector">${this.escapeHtml(elementData.cssSelector || 'N/A')}</div>
        
        <div style="margin-top: 12px;"></div>
        
        <!-- Tag + ID + Classes -->
        <div class="element-details">
            <span class="detail-badge tag"><${this.escapeHtml(elementData.tagName)}></span>
            ${elementData.id ? `<span class="detail-badge id">#${this.escapeHtml(elementData.id)}</span>` : ''}
            ${elementData.classList.length > 0 ? `<span class="detail-badge class">.${elementData.classList.map(c => this.escapeHtml(c)).join('.')}</span>` : ''}
        </div>
        
        <!-- XPath (alternative) -->
        <div class="element-selector-label" style="margin-top: 10px;">XPath</div>
        <div class="element-selector" style="color: #dcdcaa;">${this.escapeHtml(elementData.xpath || 'N/A')}</div>
    </div>

    <label for="instruction">What do you want to change?</label>
    <textarea id="instruction" placeholder="e.g., center this element, make it bigger, add margin, change color to blue"></textarea>
    <div class="hint">Press Ctrl+Enter to submit</div>

    <div class="buttons">
        <button class="cancel-btn" onclick="cancel()">✕ Cancel</button>
        <button class="apply-btn" onclick="apply()">✓ Apply Changes</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi ? acquireVsCodeApi() : null;
        
        // Initialize element data from the server-side data
        window.selectedElementData = ${elementDataJson};
        
        function apply() {
            const instruction = document.getElementById('instruction').value.trim();
            if (instruction) {
                // Get element data from global variable
                const elementData = window.selectedElementData;
                vscode.postMessage({
                    type: 'prompt-submitted',
                    payload: {
                        instruction: instruction,
                        element: elementData
                    }
                });
            }
        }

        // Also handle the case where AI returned a suggestion and user confirms
        function confirmApply(changeSet) {
            const elementData = window.selectedElementData;
            vscode.postMessage({
                type: 'apply-confirmed',
                payload: {
                    changeSet: changeSet,
                    elementSelector: elementData ? elementData.cssSelector : ''
                }
            });
        }
        
        // Make confirmApply available globally
        window.confirmApply = confirmApply;

        function cancel() {
            vscode.postMessage({ type: 'cancel-prompt' });
        }

        // Handle Ctrl+Enter
        document.getElementById('instruction').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                apply();
            }
        });
        
        // Focus the textarea
        document.getElementById('instruction').focus();
    </script>
</body>
</html>
`;
    }

    /**
     * Hide the sidebar
     */
    public hide(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }

    /**
     * Register message handler
     */
    public onMessage(handler: (message: any) => void): void {
        this.messageHandler = handler;
    }
}

