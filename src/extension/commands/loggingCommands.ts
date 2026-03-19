// Logging commands for AI
import * as vscode from 'vscode';
import { AILogger } from '../ai/aiLogger';

// Global reference to logger
let aiLogger: AILogger | undefined;

/**
 * Set the global logger instance
 */
export function setLogger(logger: AILogger): void {
    aiLogger = logger;
}

/**
 * Register logging commands
 */
export function registerLoggingCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Enable AI Logging
    const enableLoggingCommand = vscode.commands.registerCommand(
        'aiVisualEditor.enableAiLogging',
        async () => {
            if (!aiLogger) {
                vscode.window.showErrorMessage('Logger not initialized');
                return;
            }

            aiLogger.setEnabled(true);
            await aiLogger.initialize();

            // Save to config
            const config = vscode.workspace.getConfiguration('aiVisualEditor');
            await config.update('aiLogging.enabled', true, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage('AI Logging enabled');
        }
    );

    // Disable AI Logging
    const disableLoggingCommand = vscode.commands.registerCommand(
        'aiVisualEditor.disableAiLogging',
        async () => {
            if (!aiLogger) {
                vscode.window.showErrorMessage('Logger not initialized');
                return;
            }

            aiLogger.setEnabled(false);
            aiLogger.close();

            // Save to config
            const config = vscode.workspace.getConfiguration('aiVisualEditor');
            await config.update('aiLogging.enabled', false, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage('AI Logging disabled');
        }
    );

    // Open Logs Folder
    const openLogsFolderCommand = vscode.commands.registerCommand(
        'aiVisualEditor.openLogsFolder',
        async () => {
            if (!aiLogger) {
                vscode.window.showErrorMessage('Logger not initialized');
                return;
            }

            await aiLogger.openLogFolder();
        }
    );

    // View Today's Logs
    const viewLogsCommand = vscode.commands.registerCommand(
        'aiVisualEditor.viewTodayLogs',
        async () => {
            if (!aiLogger) {
                vscode.window.showErrorMessage('Logger not initialized');
                return;
            }

            await aiLogger.openLogFile();
        }
    );

    // Toggle Logging
    const toggleLoggingCommand = vscode.commands.registerCommand(
        'aiVisualEditor.toggleAiLogging',
        async () => {
            if (!aiLogger) {
                vscode.window.showErrorMessage('Logger not initialized');
                return;
            }

            const isEnabled = aiLogger.isEnabled();
            
            if (isEnabled) {
                aiLogger.setEnabled(false);
                aiLogger.close();
                
                const config = vscode.workspace.getConfiguration('aiVisualEditor');
                await config.update('aiLogging.enabled', false, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage('AI Logging disabled');
            } else {
                aiLogger.setEnabled(true);
                await aiLogger.initialize();
                
                const config = vscode.workspace.getConfiguration('aiVisualEditor');
                await config.update('aiLogging.enabled', true, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage('AI Logging enabled');
            }
        }
    );

    disposables.push(
        enableLoggingCommand,
        disableLoggingCommand,
        openLogsFolderCommand,
        viewLogsCommand,
        toggleLoggingCommand
    );

    return disposables;
}
