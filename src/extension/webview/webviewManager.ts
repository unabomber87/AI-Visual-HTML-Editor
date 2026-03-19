// AI Visual HTML Editor - Webview Manager
import * as vscode from 'vscode';
import * as path from 'path';
import { ElementData, ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../shared/types';

export class WebviewManager {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel | undefined;
    private currentHtmlFile: string | undefined;
    private messageHandler: ((message: WebviewToExtensionMessage) => void) | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Create a live preview of the HTML file
     */
    public async createPreview(htmlPath: string): Promise<vscode.WebviewPanel> {
        // If panel exists, just reveal it
        if (this.panel) {
            this.refreshPreview();
            return this.panel;
        }

        // Create new webview panel
        this.panel = vscode.window.createWebviewPanel(
            'aiVisualEditor',
            'AI Visual HTML Editor',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.dirname(htmlPath))
                ]
            }
        );

        // Load and inject HTML content
        await this.loadHtmlContent(htmlPath);

        // Handle message from webview
        this.panel.webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
            if (this.messageHandler) {
                this.messageHandler(message);
            }
        });

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.currentHtmlFile = undefined;
        });

        return this.panel;
    }

    /**
     * Load HTML content into the webview
     */
    private async loadHtmlContent(htmlPath: string): Promise<void> {
        if (!this.panel) return;

        const fs = require('fs');
        let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

        // Inject the inspector script
        const scriptToInject = this.getInspectorScript();
        htmlContent = this.injectScript(htmlContent, scriptToInject);

        // Update webview HTML
        this.panel.webview.html = htmlContent;
        this.currentHtmlFile = htmlPath;
    }

    /**
     * Inject JavaScript into the HTML for element inspection
     */
    private injectScript(htmlContent: string, script: string): string {
        // Create a simple script tag
        const scriptTag = '<script>' + script + '</script>';
        
        // Inject before </body> tag
        const closingBody = '</body>';
        if (htmlContent.includes(closingBody)) {
            return htmlContent.replace(closingBody, scriptTag + closingBody);
        }
        
        // If no body tag, inject at the end
        return htmlContent + scriptTag;
    }

    /**
     * Get the inspector script to inject into the webview
     * This script generates unique CSS selectors based on element hierarchy
     */
    private getInspectorScript(): string {
        return `
(function() {
    // State - Dual Highlight System
    var isPickerEnabled = false;
    var highlightedElement = null;
    var pickerElement = null; // Element under cursor (for picker overlay)
    var selectedElement = null; // Currently selected element
    
    // Two overlays: Picker (green) and Selected (blue)
    var pickerOverlay = null;    // Green - hover preview
    var selectedOverlay = null;  // Blue - locked to selected element

    // Get VSCode API
    var vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

    // Send message to extension
    function sendMessage(message) {
        if (vscode) {
            vscode.postMessage(message);
        } else {
            console.log('VSCode message:', message);
        }
    }

    // Generate unique CSS selector from element hierarchy
    // Format: body > div.classname:nth-child(n) > section.classname ...
    function generateUniqueSelector(element) {
        var parts = [];
        var current = element;

        while (current && current !== document.body) {
            var selector = current.tagName.toLowerCase();

            // Add ID if present - this makes the selector unique
            if (current.id) {
                selector += '#' + current.id;
                parts.unshift(selector);
                break;
            }

            // Add all classes
            if (current.className && typeof current.className === 'string') {
                var classes = current.className.trim().split(/\\s+/).filter(function(c) { return c; });
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }

            // Add nth-child to make it unique in the parent
            var parent = current.parentElement;
            if (parent) {
                var children = Array.from(parent.children);
                var index = children.indexOf(current) + 1;
                selector += ':nth-child(' + index + ')';
            }

            parts.unshift(selector);
            current = current.parentElement;
        }

        // Return the selector WITHOUT 'body >' prefix - it's unnecessary and can affect multiple elements
        return parts.join(' > ');
    }

    // Generate XPath for element
    function generateXPath(element) {
        var parts = [];
        var current = element;

        while (current && current !== document.body.parentElement) {
            var selector = current.tagName.toLowerCase();

            if (current.id) {
                selector += '[@id="' + current.id + '"]';
                parts.unshift(selector);
                break;
            }

            var parent = current.parentElement;
            if (parent) {
                var children = Array.from(parent.children);
                var index = children.indexOf(current) + 1;
                selector += '[' + index + ']';
            }

            parts.unshift('/' + selector);
            current = current.parentElement;
        }

        return '/html/body' + parts.join('');
    }

    // Get element attributes
    function getAttributes(element) {
        var attrs = {};
        if (element.attributes) {
            for (var i = 0; i < element.attributes.length; i++) {
                var attr = element.attributes[i];
                attrs[attr.name] = attr.value;
            }
        }
        return attrs;
    }

    // Get computed styles
    function getStyles(element) {
        var styles = {};
        if (element instanceof HTMLElement) {
            var computed = window.getComputedStyle(element);
            var importantProps = [
                'display', 'position', 'top', 'right', 'bottom', 'left',
                'width', 'height', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                'border', 'border-radius',
                'background', 'background-color', 'background-image',
                'color', 'font-size', 'font-family', 'font-weight', 'text-align', 
                'flex', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap',
                'grid', 'grid-template-columns', 'grid-template-rows',
                'overflow', 'overflow-x', 'overflow-y',
                'z-index', 'opacity', 'transform', 'transition',
                'box-shadow', 'cursor'
            ];
            for (var i = 0; i < importantProps.length; i++) {
                var prop = importantProps[i];
                var value = computed.getPropertyValue(prop);
                if (value && value !== '') {
                    styles[prop] = value;
                }
            }
        }
        return styles;
    }

    // Extract complete element data with unique selector
    function extractElementData(target) {
        var classList = [];
        if (target.className && typeof target.className === 'string') {
            classList = target.className.trim().split(/\\s+/).filter(function(c) { return c; });
        }

        var elementData = {
            tagName: target.tagName.toLowerCase(),
            id: target.id || '',
            classList: classList,
            outerHTML: target.outerHTML.substring(0, 500),
            innerHTML: target.innerHTML ? target.innerHTML.substring(0, 200) : '',
            xpath: generateXPath(target),
            cssSelector: generateUniqueSelector(target),
            attributes: getAttributes(target),
            styles: getStyles(target)
        };
        
        return elementData;
    }

    // Create dual highlight overlays and toolbar
    function createUI() {
        if (pickerOverlay) return;
        
        // Create PICKER overlay (green) - for hover preview
        pickerOverlay = document.createElement('div');
        pickerOverlay.id = 'ai-picker-overlay';
        pickerOverlay.style.cssText = 'position: fixed; border: 2px solid #28a745; background-color: rgba(40, 167, 69, 0.1); pointer-events: none; z-index: 99998; display: none;';
        document.body.appendChild(pickerOverlay);
        
        // Create SELECTED overlay (blue) - for selected element
        selectedOverlay = document.createElement('div');
        selectedOverlay.id = 'ai-selected-overlay';
        selectedOverlay.style.cssText = 'position: fixed; border: 2px solid #007acc; background-color: rgba(0, 122, 204, 0.2); pointer-events: none; z-index: 99999; display: none;';
        document.body.appendChild(selectedOverlay);
        
        // Create toolbar at the TOP of the page
        var toolbar = document.createElement('div');
        toolbar.id = 'ai-toolbar';
        toolbar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; height: 50px; z-index: 999999; display: flex; gap: 10px; padding: 10px 20px; background: #252526; border-bottom: 2px solid #007acc; align-items: center; justify-content: flex-end; font-family: -apple-system, BlinkMacSystemFont, sans-serif;';
        
        // Create picker button
        var pickerBtn = document.createElement('button');
        pickerBtn.id = 'ai-picker-btn';
        pickerBtn.textContent = '🎯 Pick';
        pickerBtn.style.cssText = 'padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        pickerBtn.onclick = function(e) {
            e.stopPropagation();
            isPickerEnabled = !isPickerEnabled;
            if (isPickerEnabled) {
                pickerBtn.style.background = '#dc3545';
                pickerBtn.textContent = '✕ Stop';
                document.body.style.cursor = 'crosshair';
            } else {
                pickerBtn.style.background = '#28a745';
                pickerBtn.textContent = '🎯 Pick';
                document.body.style.cursor = 'default';
                clearHighlight();
                // Send message to close the sidebar
                sendMessage({ type: 'close-sidebar' });
            }
            sendMessage({ type: isPickerEnabled ? 'picker-enabled' : 'picker-disabled' });
        };
        toolbar.appendChild(pickerBtn);
        
        // Create refresh button
        var refreshBtn = document.createElement('button');
        refreshBtn.id = 'ai-refresh-btn';
        refreshBtn.textContent = '🔄 Refresh';
        refreshBtn.style.cssText = 'padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        refreshBtn.onclick = function(e) {
            e.stopPropagation();
            sendMessage({ type: 'refresh-requested' });
        };
        toolbar.appendChild(refreshBtn);
        
        // Create undo button - initially hidden
        var undoBtn = document.createElement('button');
        undoBtn.id = 'ai-undo-btn';
        undoBtn.textContent = '↶ Undo';
        undoBtn.style.cssText = 'padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; display: none;';
        undoBtn.onclick = function(e) {
            e.stopPropagation();
            sendMessage({ type: 'undo-request' });
        };
        toolbar.appendChild(undoBtn);
        
        // Create settings button
        var settingsBtn = document.createElement('button');
        settingsBtn.id = 'ai-settings-btn';
        settingsBtn.textContent = '⚙️ Settings';
        settingsBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        settingsBtn.onclick = function(e) {
            e.stopPropagation();
            sendMessage({ type: 'open-settings' });
        };
        toolbar.appendChild(settingsBtn);
        
        document.body.appendChild(toolbar);
        
        // Add padding to body
        document.body.style.paddingTop = '60px';
    }

    // Clear all highlights
    function clearHighlight() {
        // Clear picker overlay (green)
        if (pickerOverlay) {
            pickerOverlay.style.display = 'none';
        }
        pickerElement = null;
        
        // Clear selected overlay (blue)
        if (selectedOverlay) {
            selectedOverlay.style.display = 'none';
        }
        highlightedElement = null;
        selectedElement = null;
    }

    // Update picker overlay (green) - follows cursor on hover
    function updatePickerOverlay(target) {
        if (!isPickerEnabled || !pickerOverlay) return;
        
        pickerElement = target;
        var rect = target.getBoundingClientRect();
        pickerOverlay.style.top = rect.top + 'px';
        pickerOverlay.style.left = rect.left + 'px';
        pickerOverlay.style.width = rect.width + 'px';
        pickerOverlay.style.height = rect.height + 'px';
        pickerOverlay.style.display = 'block';
    }

    // Lock selected overlay (blue) to clicked element
    function updateSelectedOverlay(target) {
        if (!selectedOverlay) return;
        
        selectedElement = target;
        highlightedElement = target;
        
        var rect = target.getBoundingClientRect();
        selectedOverlay.style.top = rect.top + 'px';
        selectedOverlay.style.left = rect.left + 'px';
        selectedOverlay.style.width = rect.width + 'px';
        selectedOverlay.style.height = rect.height + 'px';
        selectedOverlay.style.display = 'block';
    }

    // Initialize when DOM is ready
    function init() {
        createUI();
        
        // Mouse move - update picker overlay (green) on hover
        document.addEventListener('mousemove', function(e) {
            if (!isPickerEnabled) return;
            var target = e.target;
            if (target && target !== document.body && target !== document.documentElement) {
                updatePickerOverlay(target);
            }
        });
        
        // Mouse leave - hide picker overlay (green) but keep selected overlay (blue)
        document.addEventListener('mouseleave', function(e) {
            if (!isPickerEnabled) return;
            // Hide picker (green) but keep selected (blue) visible
            if (pickerOverlay) {
                pickerOverlay.style.display = 'none';
            }
            pickerElement = null;
        });
        
        // Click - select element (moves blue overlay, keeps green active)
        document.addEventListener('click', function(e) {
            if (!isPickerEnabled) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            var target = e.target;
            if (target && target !== document.body && target !== document.documentElement) {
                // Extract complete element data with unique selector
                var elementData = extractElementData(target);
                
                // Move blue overlay to clicked element
                // Green overlay stays active for new selection
                updateSelectedOverlay(target);
                
                // Log the unique selector for debugging
                console.log('=== AI Visual Editor ===');
                console.log('Element clicked:', elementData.tagName);
                console.log('Unique CSS Selector:', elementData.cssSelector);
                console.log('XPath:', elementData.xpath);
                console.log('Classes:', elementData.classList.join(', '));
                console.log('========================');
                
                sendMessage({
                    type: 'element-clicked',
                    payload: elementData
                });
            }
        });
        
        // Update both overlays on scroll
        document.addEventListener('scroll', function() {
            // Update picker (green) if hovering
            if (pickerElement && pickerOverlay) {
                var pickerRect = pickerElement.getBoundingClientRect();
                pickerOverlay.style.top = pickerRect.top + 'px';
                pickerOverlay.style.left = pickerRect.left + 'px';
                pickerOverlay.style.width = pickerRect.width + 'px';
                pickerOverlay.style.height = pickerRect.height + 'px';
            }
            
            // Update selected (blue) if element is selected
            if (selectedElement && selectedOverlay) {
                var selectedRect = selectedElement.getBoundingClientRect();
                selectedOverlay.style.top = selectedRect.top + 'px';
                selectedOverlay.style.left = selectedRect.left + 'px';
                selectedOverlay.style.width = selectedRect.width + 'px';
                selectedOverlay.style.height = selectedRect.height + 'px';
            }
        }, true);
        
        // Listen for messages from extension
        window.addEventListener('message', function(event) {
            var message = event.data;
            if (message && message.type === 'enable-picker') {
                isPickerEnabled = true;
                document.body.style.cursor = 'crosshair';
            } else if (message && message.type === 'clear-highlight') {
                clearHighlight();
            } else if (message && message.type === 'show-undo') {
                var undoBtn = document.getElementById('ai-undo-btn');
                if (undoBtn) undoBtn.style.display = 'inline-block';
            } else if (message && message.type === 'hide-undo') {
                var undoBtn = document.getElementById('ai-undo-btn');
                if (undoBtn) undoBtn.style.display = 'none';
            }
        });
        
        console.log('AI Visual Editor initialized with unique selector generation');
    }

    // Run init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
`;
    }

    /**
     * Refresh the preview
     */
    public refreshPreview(): void {
        if (this.panel && this.currentHtmlFile) {
            this.loadHtmlContent(this.currentHtmlFile);
        }
    }

    /**
     * Post message to webview
     */
    public postMessage(message: ExtensionToWebviewMessage): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    /**
     * Register message handler
     */
    public onMessage(handler: (message: WebviewToExtensionMessage) => void): void {
        this.messageHandler = handler;
    }

    /**
     * Check if preview is active
     */
    public isActive(): boolean {
        return this.panel !== undefined;
    }

    /**
     * Get current HTML file path
     */
    public getCurrentHtmlFile(): string | undefined {
        return this.currentHtmlFile;
    }

    /**
     * Dispose the preview
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
            this.currentHtmlFile = undefined;
        }
    }
}
