import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import { StoreSchema, schema } from '../store.js';

const store = new Store<StoreSchema>({ schema: schema as any });

export function registerSettingsHandlers() {
    ipcMain.handle('get-setting', (_event, key: keyof StoreSchema) => {
        return store.get(key);
    });

    ipcMain.handle('set-setting', (_event, key: keyof StoreSchema, value: any) => {
        store.set(key, value);
        return true;
    });

    ipcMain.handle('select-directory', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return null;
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
            title: 'Select Download Location',
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });

    ipcMain.handle('get-default-download-location', () => {
        return app.getPath('downloads');
    });

    ipcMain.handle('open-external', async (_event, url: string) => {
        try {
            await shell.openExternal(url);
            return true;
        } catch (err) {
            console.error('Failed to open external url', err);
            return false;
        }
    });

    ipcMain.handle('get-app-version', () => {
        let buildVersion = '';
        try {
            const pkgPath = path.join(app.getAppPath(), 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                buildVersion = pkg.buildVersion || '';
            }
        } catch (err) {
            console.warn('Could not read package.json for build version', err);
        }

        return {
            version: app.getVersion(),
            buildVersion
        };
    });

    ipcMain.handle('get-github-commits', async () => {
        try {
            const response = await fetch('https://api.github.com/repos/saraansx/Luniq-Music/commits?per_page=10', {
                headers: {
                    'User-Agent': 'Luniq-App'
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (err) {
            console.error('[Main] Failed to fetch commits:', err);
            return null;
        }
    });

    // ── Custom Theme Extension Handlers ──
    const getThemesDir = () => {
        const dir = path.join(app.getPath('userData'), 'themes');
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
            } catch (err) {
                console.error('[Theme] Failed to create themes directory:', err);
            }
        }
        return dir;
    };

    ipcMain.handle('get-custom-themes', async () => {
        try {
            const themesDir = getThemesDir();
            const files = await fs.promises.readdir(themesDir);
            const themes: any[] = [];

            for (const file of files) {
                if (file.toLowerCase().endsWith('.json')) {
                    try {
                        let content = await fs.promises.readFile(path.join(themesDir, file), 'utf-8');
                        // Strip UTF-8 BOM and normalize Windows curly quotes if any
                        if (content.charCodeAt(0) === 0xFEFF) {
                            content = content.slice(1);
                        }
                        content = content.trim();
                        const parsed = JSON.parse(content);
                        if (parsed && typeof parsed === 'object') {
                            const name = parsed.name || file.replace(/\.json$/i, '');
                            const id = parsed.id || file.replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                            themes.push({
                                colors: {},
                                ...parsed,
                                id,
                                name,
                                fileName: file
                            });
                        }
                    } catch (e) {
                        console.warn(`[Theme] Failed to parse theme file ${file}:`, e);
                    }
                }
            }
            return themes;
        } catch (err) {
            console.error('[Theme] Error getting custom themes:', err);
            return [];
        }
    });

    ipcMain.handle('save-custom-theme', async (_event, themeData: any) => {
        try {
            if (!themeData || !themeData.id) return { success: false, error: 'Invalid theme data' };
            const themesDir = getThemesDir();
            const safeName = `${themeData.id.replace(/[^a-z0-9_-]/gi, '_')}.json`;
            const filePath = path.join(themesDir, safeName);
            await fs.promises.writeFile(filePath, JSON.stringify(themeData, null, 2), 'utf-8');
            return { success: true };
        } catch (err: any) {
            console.error('[Theme] Error saving custom theme:', err);
            return { success: false, error: err.message || 'Failed to save theme' };
        }
    });

    ipcMain.handle('delete-custom-theme', async (_event, themeId: string) => {
        try {
            const themesDir = getThemesDir();
            const safeName = `${themeId.replace(/[^a-z0-9_-]/gi, '_')}.json`;
            const filePath = path.join(themesDir, safeName);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
            return { success: true };
        } catch (err: any) {
            console.error('[Theme] Error deleting theme:', err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('open-themes-folder', async () => {
        try {
            const themesDir = getThemesDir();
            await shell.openPath(themesDir);
            return true;
        } catch (err) {
            console.error('[Theme] Failed to open themes folder:', err);
            return false;
        }
    });

    ipcMain.handle('import-theme-dialog', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return null;
        const result = await dialog.showOpenDialog(win, {
            title: 'Import Luniq Theme Extension (.json)',
            filters: [{ name: 'Luniq Theme JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (result.canceled || result.filePaths.length === 0) return null;

        try {
            let content = await fs.promises.readFile(result.filePaths[0], 'utf-8');
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            content = content.trim();
            const theme = JSON.parse(content);
            const name = theme.name || path.basename(result.filePaths[0], path.extname(result.filePaths[0]));
            const id = theme.id || name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            const sanitizedTheme = { ...theme, id, name };
            const themesDir = getThemesDir();
            const safeName = `${id.replace(/[^a-z0-9_-]/gi, '_')}.json`;
            await fs.promises.writeFile(path.join(themesDir, safeName), JSON.stringify(sanitizedTheme, null, 2), 'utf-8');
            return { success: true, theme: sanitizedTheme };
        } catch (err: any) {
            return { error: err.message || 'Failed to import theme' };
        }
    });

    ipcMain.handle('select-background-image', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return null;
        const result = await dialog.showOpenDialog(win, {
            title: 'Select Custom Wallpaper / Background Image',
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] }
            ],
            properties: ['openFile']
        });
        if (result.canceled || result.filePaths.length === 0) return null;

        try {
            const filePath = result.filePaths[0];
            const buffer = await fs.promises.readFile(filePath);
            const ext = path.extname(filePath).slice(1).toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' 
                : ext === 'webp' ? 'image/webp' 
                : ext === 'gif' ? 'image/gif' 
                : ext === 'avif' ? 'image/avif' 
                : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
            return { success: true, filePath, dataUrl };
        } catch (err: any) {
            console.error('[Settings] Error reading background image:', err);
            return { success: false, error: err.message || 'Failed to load image' };
        }
    });
}

