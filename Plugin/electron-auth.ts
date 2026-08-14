import { BrowserWindow, session, app } from "electron";
import { SpotifyAuthCore } from "./spotify-auth-core.js";
import type { SpotifyCredentials } from "./types.js";
import path from "node:path";

export class ElectronSpotifyAuth {
  private core: SpotifyAuthCore;

  constructor() {
    this.core = new SpotifyAuthCore();
  }

  async login(): Promise<SpotifyCredentials> {
    return new Promise((resolve, reject) => {
      const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, "Luniq.png")
        : path.join(app.getAppPath(), "src", "assets", "Luniq.png");

      const partition = `temp-login-${Date.now()}`;
      const loginSession = session.fromPartition(partition);

      // Full clean Firefox User-Agent without any Electron or Chrome tokens
      const firefoxUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
      loginSession.setUserAgent(firefoxUA);

      // Intercept and sanitize headers for Google and Spotify domains
      loginSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const requestHeaders = { ...details.requestHeaders };
        requestHeaders['User-Agent'] = firefoxUA;
        delete requestHeaders['X-Electron'];
        delete requestHeaders['x-requested-with'];
        delete requestHeaders['Sec-Fetch-User'];
        callback({ cancel: false, requestHeaders });
      });

      const loginWindow = new BrowserWindow({
        width: 800,
        height: 700,
        title: "Luniq",
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: partition,
          webSecurity: true,
        },
      });

      loginWindow.setMenuBarVisibility(false);
      loginWindow.webContents.setUserAgent(firefoxUA);

      // Disable window.navigator.webdriver and Electron globals
      loginWindow.webContents.on('dom-ready', () => {
        loginWindow.webContents.executeJavaScript(`
          try {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          } catch(e) {}
        `).catch(() => {});
      });

      loginWindow.on("page-title-updated", (e) => {
        e.preventDefault();
      });

      loginWindow.loadURL("https://accounts.spotify.com/en/login", {
        userAgent: firefoxUA,
      });



      const handleNavigation = async (_url: string) => {
        const cookies = await session.fromPartition(partition).cookies.get({
          domain: "spotify.com",
        });
        const spDcCookie = cookies.find((c) => c.name === "sp_dc");

        if (spDcCookie) {
          try {
            const tokenData = await this.core.getAccessToken(spDcCookie.value);

            const credentials: SpotifyCredentials = {
              cookies: cookies,
              accessToken: tokenData.accessToken,
              expiration: tokenData.accessTokenExpirationTimestampMs,
            };

            loginWindow.close();
            resolve(credentials);
          } catch (err) {
            reject(err);
          }
        }
      };

      loginWindow.webContents.on("did-navigate", (_event, url) =>
        handleNavigation(url),
      );
      loginWindow.webContents.on("did-redirect-navigation", (_event, url) =>
        handleNavigation(url),
      );

      loginWindow.on("closed", () => {
        reject(new Error("Login window was closed before completion"));
      });
    });
  }

  async refresh(
    spDc: string,
  ): Promise<Pick<SpotifyCredentials, "accessToken" | "expiration">> {
    const tokenData = await this.core.getAccessToken(spDc);
    return {
      accessToken: tokenData.accessToken,
      expiration: tokenData.accessTokenExpirationTimestampMs,
    };
  }
}
