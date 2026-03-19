// AI Logger Service - Handles logging of AI queries and responses
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AILogQuery, AILogAnswer, AILogEntry } from '../../shared/types';

export class AILogger {
    private logDir: string;
    private logFile: string;
    private stream: fs.WriteStream | null = null;
    private enabled: boolean = false;
    private format: 'json' | 'readable' = 'json';
    private includeFullPrompt: boolean = true;

    constructor(workspacePath: string) {
        this.logDir = path.join(workspacePath, 'ai-logs');
        this.logFile = path.join(this.logDir, `ai-session-${this.getDateString()}.log`);
    }

    /**
     * Generate UUID for log entries
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get current date string for filename
     */
    private getDateString(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    /**
     * Initialize the logger - create log directory and file
     */
    async initialize(): Promise<void> {
        if (!this.enabled) {
            console.log('[AILogger] Logging is disabled');
            return;
        }

        try {
            // Create log directory if it doesn't exist
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                console.log('[AILogger] Created log directory:', this.logDir);
            }

            // Check if we need to rotate to a new file (new day)
            const expectedFile = path.join(this.logDir, `ai-session-${this.getDateString()}.log`);
            if (expectedFile !== this.logFile) {
                this.logFile = expectedFile;
                this.close();
            }

            // Create write stream in append mode
            this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
            console.log('[AILogger] Initialized log file:', this.logFile);
        } catch (error) {
            console.error('[AILogger] Failed to initialize:', error);
        }
    }

    /**
     * Set logging enabled state
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Set log format
     */
    setFormat(format: 'json' | 'readable'): void {
        this.format = format;
    }

    /**
     * Set whether to include full prompt
     */
    setIncludeFullPrompt(include: boolean): void {
        this.includeFullPrompt = include;
    }

    /**
     * Check if logging is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get the log file path
     */
    getLogFilePath(): string {
        return this.logFile;
    }

    /**
     * Get the log directory path
     */
    getLogDirPath(): string {
        return this.logDir;
    }

    /**
     * Log a query entry
     */
    async logQuery(entry: Omit<AILogQuery, 'id' | 'timestamp'>): Promise<string> {
        if (!this.enabled) {
            return '';
        }

        const queryId = this.generateUUID();
        const timestamp = new Date().toISOString();

        const fullEntry: AILogQuery = {
            ...entry,
            id: queryId,
            timestamp
        };

        // Store query in memory for pairing with answer
        (this as any).pendingQueries = (this as any).pendingQueries || {};
        (this as any).pendingQueries[queryId] = fullEntry;

        // Truncate instruction if too long
        if (fullEntry.instruction && fullEntry.instruction.length > 1000) {
            fullEntry.instruction = fullEntry.instruction.substring(0, 1000) + '...';
        }

        // Truncate full prompt if too long
        if (fullEntry.fullPrompt && fullEntry.fullPrompt.length > 5000) {
            fullEntry.fullPrompt = fullEntry.fullPrompt.substring(0, 5000) + '...';
        }

        // Don't include full prompt if disabled
        if (!this.includeFullPrompt) {
            delete fullEntry.fullPrompt;
        }

        if (this.format === 'json') {
            this.writeLine(JSON.stringify({ query: fullEntry }));
        } else {
            this.writeLine(this.formatReadableQuery(fullEntry));
        }

        return queryId;
    }

    /**
     * Log an answer entry
     */
    async logAnswer(entry: Omit<AILogAnswer, 'timestamp'>): Promise<void> {
        if (!this.enabled) {
            return;
        }

        // Get the stored query
        const pendingQueries = (this as any).pendingQueries || {};
        const queryId = (entry as any).id || '';
        const query = pendingQueries[queryId];

        const timestamp = new Date().toISOString();

        const fullEntry: AILogAnswer = {
            ...entry,
            id: queryId,
            timestamp
        };

        // Truncate CSS if too long
        if (fullEntry.response?.changes?.css && fullEntry.response.changes.css.length > 5000) {
            fullEntry.response.changes.css = fullEntry.response.changes.css.substring(0, 5000) + '...';
        }

        // Truncate HTML if too long
        if (fullEntry.response?.changes?.html && fullEntry.response.changes.html.length > 5000) {
            fullEntry.response.changes.html = fullEntry.response.changes.html.substring(0, 5000) + '...';
        }

        if (this.format === 'json') {
            if (query) {
                const logEntry: AILogEntry = {
                    query,
                    answer: fullEntry
                };
                this.writeLine(JSON.stringify(logEntry));
                delete pendingQueries[queryId];
            } else {
                // Log just the answer if no query found
                this.writeLine(JSON.stringify({ answer: fullEntry }));
            }
        } else {
            this.writeLine(this.formatReadableAnswer(fullEntry, query));
        }
    }

    /**
     * Write a line to the log file
     */
    private writeLine(line: string): void {
        if (this.stream) {
            this.stream.write(line + '\n');
        }
    }

    /**
     * Format query as readable text
     */
    private formatReadableQuery(query: AILogQuery): string {
        const separator = '='.repeat(80);
        return `${separator}
[${query.timestamp}] QUERY #${query.id}
${separator}
Provider:  ${query.provider}
Instruction: ${query.instruction}
Element:    ${query.elementContext.tagName}${query.elementContext.id ? '#' + query.elementContext.id : ''}${query.elementContext.classList.length > 0 ? '.' + query.elementContext.classList.join('.') : ''} (${query.elementContext.cssSelector})
File:       ${query.elementContext.filePath || 'N/A'}
${query.fullPrompt ? `\nFull Prompt:\n${query.fullPrompt}\n` : ''}`;
    }

    /**
     * Format answer as readable text
     */
    private formatReadableAnswer(answer: AILogAnswer, query?: AILogQuery): string {
        const separator = '='.repeat(80);
        
        let content = `${separator}
[${answer.timestamp}] ANSWER #${answer.id} (${answer.duration}ms)
${separator}
Status:     ${answer.success ? 'SUCCESS ✓' : 'ERROR ✗'}
`;

        if (answer.success && answer.response) {
            content += `Selector:   ${answer.response.selector}
CSS:        ${answer.response.changes.css || '(no changes)'}
HTML:       ${answer.response.changes.html || '(no changes)'}
`;
        } else if (!answer.success && answer.error) {
            content += `Error Type: ${answer.error.type}
Error Msg:  ${answer.error.message}
Retryable:  ${answer.error.retryable ? 'Yes' : 'No'}
`;
        }

        return content;
    }

    /**
     * Close the write stream
     */
    close(): void {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
    }

    /**
     * Open the log folder in VSCode
     */
    async openLogFolder(): Promise<void> {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        const uri = vscode.Uri.file(this.logDir);
        await vscode.commands.executeCommand('revealFileInOS', uri);
    }

    /**
     * Open the current log file
     */
    async openLogFile(): Promise<void> {
        if (!fs.existsSync(this.logFile)) {
            vscode.window.showInformationMessage('No log file found for today');
            return;
        }

        const document = await vscode.workspace.openTextDocument(this.logFile);
        await vscode.window.showTextDocument(document);
    }
}
