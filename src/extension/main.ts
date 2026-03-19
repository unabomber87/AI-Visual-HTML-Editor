// AI Visual HTML Editor - Main Extension Entry Point
import * as vscode from 'vscode';
import { WebviewManager } from './webview/webviewManager';
import { SidebarManager } from './webview/sidebarManager';
import { AIService } from './ai/aiService';
import { AILogger } from './ai/aiLogger';
import { CSSApplier } from './editor/cssApplier';
import { HTMLApplier } from './editor/htmlApplier';
import { registerCommands } from './commands';
import { registerConfigCommands } from './commands/configCommands';
import { registerLoggingCommands, setLogger } from './commands/loggingCommands';
import { ConfigService } from './utils/config';

// Global state
let webviewManager: WebviewManager | undefined;
let sidebarManager: SidebarManager | undefined;
let aiService: AIService | undefined;
let aiLogger: AILogger | undefined;
let cssApplier: CSSApplier | undefined;
let htmlApplier: HTMLApplier | undefined;
let configService: ConfigService | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation entry point
 * Called when the extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('[AI Visual Editor] Extension activating...');

    try {
        // Initialize ConfigService with SecretStorage
        configService = new ConfigService(context.secrets);
        
        // Initialize services
        const provider = configService.getProvider();
        
        // Initialize AI Logger - use the first workspace folder if available
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspacePath = workspaceFolders && workspaceFolders.length > 0 
            ? workspaceFolders[0].uri.fsPath 
            : context.extensionUri.fsPath;
        
        aiLogger = new AILogger(workspacePath);
        
        // Check if logging is enabled in config
        const loggingConfig = vscode.workspace.getConfiguration('aiVisualEditor');
        const loggingEnabled = loggingConfig.get<boolean>('aiLogging.enabled', false);
        aiLogger.setEnabled(loggingEnabled);
        
        const logFormat = loggingConfig.get<'json' | 'readable'>('aiLogging.format', 'json');
        aiLogger.setFormat(logFormat);
        
        const includeFullPrompt = loggingConfig.get<boolean>('aiLogging.includeFullPrompt', true);
        aiLogger.setIncludeFullPrompt(includeFullPrompt);
        
        // Initialize logger (sync - directory creation may be async but we handle errors internally)
        aiLogger.initialize().catch(err => console.error('[AILogger] Init error:', err));
        
        aiService = new AIService(configService, aiLogger);
        cssApplier = new CSSApplier();
        htmlApplier = new HTMLApplier();
        webviewManager = new WebviewManager(context);
        sidebarManager = new SidebarManager(context);

        // Register VSCode commands
        registerCommands(context, webviewManager, sidebarManager, aiService, cssApplier, htmlApplier, configService);
        
        // Register configuration commands
        registerConfigCommands(context, configService);
        
        // Register logging commands and pass logger reference
        setLogger(aiLogger!);
        context.subscriptions.push(...registerLoggingCommands(context));

        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.text = '$(eye) AI Preview';
        statusBarItem.tooltip = 'Start AI Visual HTML Preview';
        statusBarItem.command = 'aiVisualEditor.startPreview';
        statusBarItem.show();

        // Show welcome message (only if no API key configured)
        showWelcomeMessage();

        console.log('[AI Visual Editor] Extension activated successfully');
    } catch (error) {
        console.error('[AI Visual Editor] Activation error:', error);
        vscode.window.showErrorMessage(`Failed to activate extension: ${error}`);
    }
}

/**
 * Extension deactivation
 * Called when VSCode shuts down or the extension is disabled
 */
export function deactivate(): void {
    console.log('[AI Visual Editor] Extension deactivated');

    // Cleanup
    webviewManager?.dispose();
    webviewManager = undefined;
    aiService = undefined;
    cssApplier = undefined;
        htmlApplier = undefined;
    configService = undefined;
}

/**
 * Show welcome message on first activation
 */
async function showWelcomeMessage(): Promise<void> {
    // Check if any API key is already configured
    const hasGroqKey = await configService?.getApiKey('groq');
    const hasOpenAIKey = await configService?.getApiKey('openai');
    const hasAnthropicKey = await configService?.getApiKey('anthropic');
    
    if (hasGroqKey || hasOpenAIKey || hasAnthropicKey) {
        // API keys are already configured, skip welcome message
        return;
    }
    
    const action = vscode.window.showInformationMessage(
        '🎨 AI Visual Editor installed! Click here to configure AI or press Ctrl+Alt+E to start.',
        'Configure AI'
    );

    action.then((selected) => {
        if (selected === 'Configure AI') {
            vscode.commands.executeCommand('aiVisualEditor.setGroqApiKey');
        }
    });
}
