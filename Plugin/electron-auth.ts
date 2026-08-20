import { BrowserWindow, session, app } from "electron";
import type { SpotifyCredentials } from "./types.js";
import path from "node:path";

export class ElectronSpotifyAuth {
  async login(): Promise<SpotifyCredentials> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, "Luniq.png")
        : path.join(app.getAppPath(), "src", "assets", "Luniq.png");

      const partition = `temp-login-${Date.now()}`;
      const loginSession = session.fromPartition(partition);

      // Clean Firefox User-Agent prevents Google "This browser or app may not be secure" block
      const firefoxUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0";
      loginSession.setUserAgent(firefoxUA);

      // Sanitize headers to look completely like standard Firefox (strip Chromium client hints & Electron headers)
      loginSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const requestHeaders = { ...details.requestHeaders };
        requestHeaders['User-Agent'] = firefoxUA;
        delete requestHeaders['X-Electron'];
        delete requestHeaders['x-requested-with'];
        delete requestHeaders['sec-ch-ua'];
        delete requestHeaders['sec-ch-ua-mobile'];
        delete requestHeaders['sec-ch-ua-platform'];
        delete requestHeaders['sec-ch-ua-model'];
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

      const cleanup = () => {
        try {
          if (!loginWindow.isDestroyed()) {
            if (loginWindow.webContents.debugger.isAttached()) {
              loginWindow.webContents.debugger.detach();
            }
            loginWindow.destroy();
          }
        } catch {}
      };

      const finishWithCredentials = async (accessToken: string, expiration?: number) => {
        if (resolved) return;
        resolved = true;

        try {
          const cookies = await loginSession.cookies.get({ domain: "spotify.com" });
          const credentials: SpotifyCredentials = {
            cookies,
            accessToken,
            expiration: expiration || Date.now() + 3600 * 1000,
          };
          cleanup();
          resolve(credentials);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      let debuggerAttached = false;
      const attachDebuggerOnSpotify = () => {
        if (debuggerAttached || resolved) return;
        try {
          loginWindow.webContents.debugger.attach("1.3");
          loginWindow.webContents.debugger.sendCommand("Network.enable");
          debuggerAttached = true;

          loginWindow.webContents.debugger.on("message", async (_event, method, params) => {
            if (resolved) return;

            if (method === "Network.responseReceived") {
              const url = params?.response?.url || "";
              if (url.includes("/api/token") || url.includes("/get_access_token")) {
                try {
                  const res = await loginWindow.webContents.debugger.sendCommand("Network.getResponseBody", {
                    requestId: params.requestId,
                  });
                  if (res?.body) {
                    const data = JSON.parse(res.body);
                    if (data?.accessToken && !data.isAnonymous) {
                      await finishWithCredentials(data.accessToken, data.accessTokenExpirationTimestampMs);
                    }
                  }
                } catch (e) {
                  console.warn("[SpotifyAuth] Could not read response body:", e);
                }
              }
            }
          });
        } catch (err) {
          console.warn("[SpotifyAuth] Debugger attach error:", err);
        }
      };

      // Injected script to hide automation flags and intercept tokens on open.spotify.com
      const pageHookScript = `
        try {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          delete window.chrome;
        } catch(e) {}

        try {
          if (!window.__token_hooked) {
            window.__token_hooked = true;
            const origFetch = window.fetch;
            window.fetch = async function(...args) {
              const res = await origFetch.apply(this, args);
              try {
                const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
                if (url.includes('/api/token') || url.includes('/get_access_token')) {
                  const clone = res.clone();
                  clone.json().then(data => {
                    if (data && data.accessToken && !data.isAnonymous) {
                      window.__spotify_access_token_data = data;
                    }
                  }).catch(() => {});
                }
              } catch(e) {}
              return res;
            };
          }
        } catch(e) {}
      `;

      loginWindow.webContents.on("dom-ready", async () => {
        if (resolved) return;
        try {
          await loginWindow.webContents.executeJavaScript(pageHookScript);
          
          const currentUrl = loginWindow.webContents.getURL();
          if (currentUrl.includes("open.spotify.com")) {
            // Once on open.spotify.com, attach debugger if not already attached
            attachDebuggerOnSpotify();

            // Check if token was already captured via fetch hook
            const tokenData = await loginWindow.webContents.executeJavaScript(`
              window.__spotify_access_token_data || null
            `);
            if (tokenData?.accessToken && !tokenData.isAnonymous) {
              await finishWithCredentials(tokenData.accessToken, tokenData.accessTokenExpirationTimestampMs);
            }
          }
        } catch {}
      });

      const handleNavigation = async (url: string) => {
        if (resolved) return;

        // If on open.spotify.com, attach debugger to capture token
        if (url.includes("open.spotify.com")) {
          attachDebuggerOnSpotify();
        }

        const cookies = await loginSession.cookies.get({ domain: "spotify.com" });
        const spDcCookie = cookies.find((c) => c.name === "sp_dc");

        if (spDcCookie) {
          // If login completed and we're on accounts.spotify.com, redirect to open.spotify.com to load Web Player & token
          if (url.includes("accounts.spotify.com")) {
            loginWindow.loadURL("https://open.spotify.com/");
          }
        }
      };

      loginWindow.webContents.on("did-navigate", (_event, url) => handleNavigation(url));
      loginWindow.webContents.on("did-redirect-navigation", (_event, url) => handleNavigation(url));

      loginWindow.on("page-title-updated", (e) => e.preventDefault());

      loginWindow.on("closed", () => {
        if (!resolved) {
          reject(new Error("Login window was closed before completion"));
        }
      });

      // Start by loading Spotify login
      loginWindow.loadURL("https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fopen.spotify.com%2F");
    });
  }

  async refresh(
    spDc: string,
  ): Promise<Pick<SpotifyCredentials, "accessToken" | "expiration">> {
    return new Promise((resolve, reject) => {
      const partition = `temp-refresh-${Date.now()}`;
      const refreshSession = session.fromPartition(partition);

      const firefoxUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0";
      refreshSession.setUserAgent(firefoxUA);

      refreshSession.cookies.set({
        url: "https://open.spotify.com",
        name: "sp_dc",
        value: spDc,
        domain: ".spotify.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "no_restriction",
      }).then(() => {
        const refreshWindow = new BrowserWindow({
          show: false,
          width: 800,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: partition,
            webSecurity: true,
          },
        });

        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          try {
            if (!refreshWindow.isDestroyed()) {
              if (refreshWindow.webContents.debugger.isAttached()) {
                refreshWindow.webContents.debugger.detach();
              }
              refreshWindow.destroy();
            }
          } catch {}
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Spotify token refresh timed out"));
        }, 15000);

        try {
          refreshWindow.webContents.debugger.attach("1.3");
          refreshWindow.webContents.debugger.sendCommand("Network.enable");

          refreshWindow.webContents.debugger.on("message", async (_event, method, params) => {
            if (finished) return;

            if (method === "Network.responseReceived") {
              const url = params?.response?.url || "";
              if (url.includes("/api/token") || url.includes("/get_access_token")) {
                try {
                  const res = await refreshWindow.webContents.debugger.sendCommand("Network.getResponseBody", {
                    requestId: params.requestId,
                  });
                  if (res?.body) {
                    const data = JSON.parse(res.body);
                    if (data?.accessToken && !data.isAnonymous) {
                      clearTimeout(timeout);
                      cleanup();
                      resolve({
                        accessToken: data.accessToken,
                        expiration: data.accessTokenExpirationTimestampMs || Date.now() + 3600 * 1000,
                      });
                    }
                  }
                } catch (e) {
                  console.warn("[SpotifyRefresh] Could not read response body:", e);
                }
              }
            }
          });
        } catch (err) {
          console.warn("[SpotifyRefresh] Debugger attach error:", err);
        }

        refreshWindow.loadURL("https://open.spotify.com/");
      }).catch((err) => {
        reject(err);
      });
    });
  }

  async getAnonymousToken(): Promise<SpotifyCredentials> {
    return new Promise((resolve, reject) => {
      const partition = `temp-anon-${Date.now()}`;
      const anonSession = session.fromPartition(partition);

      const firefoxUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0";
      anonSession.setUserAgent(firefoxUA);

      const anonWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: partition,
          webSecurity: true,
        },
      });

      let finished = false;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        try {
          if (!anonWindow.isDestroyed()) {
            if (anonWindow.webContents.debugger.isAttached()) {
              anonWindow.webContents.debugger.detach();
            }
            anonWindow.destroy();
          }
        } catch {}
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Guest token fetch timed out"));
      }, 15000);

      try {
        anonWindow.webContents.debugger.attach("1.3");
        anonWindow.webContents.debugger.sendCommand("Network.enable");

        anonWindow.webContents.debugger.on("message", async (_event, method, params) => {
          if (finished) return;

          if (method === "Network.responseReceived") {
            const url = params?.response?.url || "";
            if (url.includes("/api/token") || url.includes("/get_access_token")) {
              try {
                const res = await anonWindow.webContents.debugger.sendCommand("Network.getResponseBody", {
                  requestId: params.requestId,
                });
                if (res?.body) {
                  const data = JSON.parse(res.body);
                  if (data?.accessToken) {
                    const cookies = await anonSession.cookies.get({ domain: "spotify.com" });
                    clearTimeout(timeout);
                    cleanup();
                    resolve({
                      accessToken: data.accessToken,
                      expiration: data.accessTokenExpirationTimestampMs || Date.now() + 3600 * 1000,
                      cookies: cookies || [],
                    });
                  }
                }
              } catch (e) {
                console.warn("[GuestToken] Could not read response body:", e);
              }
            }
          }
        });
      } catch (err) {
        console.warn("[GuestToken] Debugger attach error:", err);
      }

      anonWindow.loadURL("https://open.spotify.com/");
    });
  }
}
