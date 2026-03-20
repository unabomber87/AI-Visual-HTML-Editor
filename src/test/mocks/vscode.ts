export const ViewColumn = {
    One: 1,
    Two: 2,
    Beside: -2,
};

export const window = {
    showErrorMessage: (message: string, ...buttons: string[]) => Promise.resolve(buttons[0]),
    showInformationMessage: (message: string, ...buttons: string[]) => Promise.resolve(buttons[0]),
    showTextDocument: () => Promise.resolve({}),
    createWebviewPanel: () => ({
        webview: {
            html: '',
            postMessage: () => {},
            onDidReceiveMessage: () => ({ dispose: () => {} }),
        },
        reveal: () => {},
        onDidDispose: () => ({ dispose: () => {} }),
        dispose: () => {},
    }),
};

export const workspace = {
    getConfiguration: () => ({
        get: (key: string, defaultValue?: any) => defaultValue,
        update: (key: string, value: any, global?: boolean) => Promise.resolve(),
    }),
};

export const commands = {
    executeCommand: (command: string, ...args: any[]) => Promise.resolve(),
};

export const Uri = {
    file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
};

export class SecretStorage {
    store(key: string, value: string): Promise<void> {
        return Promise.resolve();
    }
    get(key: string): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }
    delete(key: string): Promise<void> {
        return Promise.resolve();
    }
}

export class ExtensionContext {
    subscriptions: any[] = [];
}

export const extensions = {
    getExtension: () => undefined,
};

export const env = {
    language: 'en',
};

export const version = '1.75.0';
