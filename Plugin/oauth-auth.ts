import http from "node:http";
import { shell } from "electron";
import crypto from "node:crypto";
import axios from "axios";
import type { SpotifyCredentials } from "./types.js";

// Official Spotify Client ID for Open Desktop / Web player authorization
const DEFAULT_SPOTIFY_CLIENT_ID = "65b708073fc0480ea92a077233ca87bd"; 


function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

export class ExternalSpotifyOAuth {
  private server: http.Server | null = null;

  async login(clientId: string = DEFAULT_SPOTIFY_CLIENT_ID): Promise<SpotifyCredentials> {
    return new Promise((resolve, reject) => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(16).toString("hex");

      // Create local ephemeral server
      this.server = http.createServer(async (req, res) => {
        try {
          if (!req.url) return;
          const reqUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
          
          if (reqUrl.pathname === "/callback") {
            const code = reqUrl.searchParams.get("code");
            const returnedState = reqUrl.searchParams.get("state");
            const error = reqUrl.searchParams.get("error");

            if (error) {
              res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
              res.end(this.renderHtmlResponse(false, `Authentication failed: ${error}`));
              this.cleanup();
              return reject(new Error(`Spotify login error: ${error}`));
            }

            if (returnedState !== state || !code) {
              res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
              res.end(this.renderHtmlResponse(false, "Invalid authorization state or code."));
              this.cleanup();
              return reject(new Error("State verification mismatch or missing auth code"));
            }

            // Exchange authorization code for token
            const address = this.server?.address();
            const port = typeof address === "object" && address ? address.port : 43821;
            const redirectUri = `http://127.0.0.1:${port}/callback`;

            const tokenParams = new URLSearchParams({
              client_id: clientId,
              grant_type: "authorization_code",
              code: code,
              redirect_uri: redirectUri,
              code_verifier: codeVerifier,
            });

            try {
              const tokenRes = await axios.post(
                "https://accounts.spotify.com/api/token",
                tokenParams.toString(),
                {
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                }
              );

              const { access_token, refresh_token, expires_in } = tokenRes.data;

              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(this.renderHtmlResponse(true, "Successfully authenticated with Spotify!"));
              this.cleanup();

              const credentials: SpotifyCredentials = {
                accessToken: access_token,
                expiration: Date.now() + (expires_in || 3600) * 1000,
                cookies: refresh_token ? [{ name: "refresh_token", value: refresh_token }] : [],
              };

              resolve(credentials);
            } catch (exchangeErr: any) {
              const errDetails = exchangeErr?.response?.data?.error_description || exchangeErr.message;
              res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
              res.end(this.renderHtmlResponse(false, `Token exchange failed: ${errDetails}`));
              this.cleanup();
              reject(new Error(`Token exchange failed: ${errDetails}`));
            }
          } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
          }
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      });

      // Listen on random available port
      this.server.listen(0, "127.0.0.1", () => {
        const address = this.server?.address();
        if (!address || typeof address === "string") {
          this.cleanup();
          return reject(new Error("Could not start local callback server"));
        }

        const port = address.port;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        const scopes = [
          "user-read-private",
          "user-read-email",
          "playlist-read-private",
          "playlist-read-collaborative",
          "user-library-read",
          "user-top-read",
          "user-read-recently-played",
          "user-follow-read",
        ].join(" ");

        const authUrl = new URL("https://accounts.spotify.com/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", scopes);

        // Open in user's default external browser
        shell.openExternal(authUrl.toString()).catch((err) => {
          this.cleanup();
          reject(err);
        });
      });

      // Timeout after 3 minutes if user abandons
      const timeoutId = setTimeout(() => {
        if (this.server) {
          this.cleanup();
          reject(new Error("Spotify login timed out"));
        }
      }, 180000);

      this.server.on("close", () => {
        clearTimeout(timeoutId);
      });
    });
  }

  async refresh(
    refreshToken: string,
    clientId: string = DEFAULT_SPOTIFY_CLIENT_ID
  ): Promise<Pick<SpotifyCredentials, "accessToken" | "expiration">> {
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      tokenParams.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in } = tokenRes.data;
    return {
      accessToken: access_token,
      expiration: Date.now() + (expires_in || 3600) * 1000,
    };
  }

  private cleanup() {

    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
  }

  private renderHtmlResponse(success: boolean, message: string): string {
    const accentColor = success ? "#1ed760" : "#ff4d4f";
    const title = success ? "Connected to Luniq" : "Authentication Error";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0d0e12;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(20px);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${success ? "rgba(30, 215, 96, 0.15)" : "rgba(255, 77, 79, 0.15)"};
      color: ${accentColor};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    p {
      margin: 0 0 24px;
      color: #a0a0ab;
      font-size: 15px;
      line-height: 1.5;
    }
    .subtext {
      font-size: 13px;
      color: #6a6a75;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      ${
        success
          ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
          : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      }
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="subtext">${success ? "You can close this tab and return to Luniq." : "Please return to Luniq and try again."}</div>
  </div>
</body>
</html>`;
  }
}
