// Shared types for AI Visual HTML Editor

// Element data extracted from the webview
export interface ElementData {
    tagName: string;
    id: string;
    classList: string[];
    outerHTML: string;
    innerHTML: string;
    xpath: string;
    cssSelector: string;
    attributes: Record<string, string>;
    styles: Record<string, string>;
    // Optional context fields for AI
    parentStyles?: Record<string, string>;
    dimensions?: {
        width: string;
        height: string;
        position: string;
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
    viewport?: {
        width: number;
        height: number;
        isMobile: boolean;
    };
    inlineStyles?: string;
    siblingCount?: number;
    filePath?: string;
    lineNumber?: number;
}

// Change set returned by AI
export interface ChangeSet {
    selector: string;
    changes: {
        css: string;
        html: string;
    };
}

// Webview messages sent to extension
export type WebviewToExtensionMessage =
    | { type: 'element-clicked'; payload: ElementData }
    | { type: 'element-hovered'; payload: ElementData }
    | { type: 'prompt-submitted'; payload: { instruction: string; element: ElementData } }
    | { type: 'apply-confirmed'; payload: ChangeSet }
    | { type: 'apply-cancelled' }
    | { type: 'picker-enabled' }
    | { type: 'picker-disabled' }
    | { type: 'refresh-requested' }
    | { type: 'close-sidebar' }
    | { type: 'open-settings' }
    | { type: 'undo-request' };

// Extension messages sent to webview
export type ExtensionToWebviewMessage =
    | { type: 'show-prompt'; payload: ElementData }
    | { type: 'hide-prompt' }
    | { type: 'highlight-element'; payload: ElementData }
    | { type: 'clear-highlight' }
    | { type: 'reload-preview' }
    | { type: 'show-diff'; payload: ChangeSet }
    | { type: 'hide-diff' }
    | { type: 'enable-picker' }
    | { type: 'disable-picker' }
    | { type: 'show-undo' }
    | { type: 'hide-undo' };

// AI response structure
export interface AIResponse {
    selector: string;
    changes: {
        css: string;
        html: string;
    };
}

// AI error structure
export interface AIError {
    type: 'parse-error' | 'network-error' | 'invalid-response';
    message: string;
    retryable: boolean;
}

// AI provider type
export type AIProvider = 'openai' | 'anthropic' | 'mock' | 'groq' | 'ollama';

// Extension configuration
export interface ExtensionConfig {
    aiProvider: AIProvider;
    openAIApiKey: string;
    previewPort: number;
}

// Undo history entry
export interface UndoEntry {
    filePath: string;
    oldContent: string;
    newContent: string;
    timestamp: number;
}

// AI Logger types
export interface AILogQuery {
    id: string;
    timestamp: string;
    provider: AIProvider;
    instruction: string;
    elementContext: {
        tagName: string;
        id: string;
        classList: string[];
        cssSelector: string;
        filePath?: string;
    };
    fullPrompt?: string;
}

export interface AILogAnswer {
    id: string;
    timestamp: string;
    success: boolean;
    response?: {
        selector: string;
        changes: {
            css: string;
            html: string;
        };
    };
    error?: {
        type: string;
        message: string;
        retryable: boolean;
    };
    duration: number;
}

export interface AILogEntry {
    query: AILogQuery;
    answer: AILogAnswer;
}
