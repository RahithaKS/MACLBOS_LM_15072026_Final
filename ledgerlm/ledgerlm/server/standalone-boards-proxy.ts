import http, { ServerResponse, type IncomingMessage, type Server } from "node:http";
import https from "node:https";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import type { Express, Request, RequestHandler, Response } from "express";
import { requireAuth } from "./middleware/auth";
import { storage } from "./storage";

const STANDALONE_BOARDS_PATH = "/standalone-boards";

type ProxyTarget = {
  url: URL;
  request: typeof http.request | typeof https.request;
};

function isStandaloneBoardsHmrPath(url: string | undefined): boolean {
  const pathname = (url ?? "").split("?", 1)[0];
  return pathname === `${STANDALONE_BOARDS_PATH}/_next/webpack-hmr`;
}

function getProxyTarget(): ProxyTarget | null {
  const configuredTarget = process.env.STANDALONE_BOARDS_URL?.trim();
  if (!configuredTarget) return null;

  let url: URL;
  try {
    url = new URL(configuredTarget);
  } catch {
    throw new Error("STANDALONE_BOARDS_URL must be a valid http(s) URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("STANDALONE_BOARDS_URL must use http or https.");
  }

  return {
    url,
    request: url.protocol === "https:" ? https.request : http.request,
  };
}

function forwardedHeaders(request: IncomingMessage, target: URL) {
  const previousForwardedFor = request.headers["x-forwarded-for"];
  const remoteAddress = request.socket.remoteAddress;
  const forwardedFor = [previousForwardedFor, remoteAddress].filter(Boolean).join(", ");
  const isSecure = "encrypted" in request.socket && Boolean((request.socket as { encrypted?: boolean }).encrypted);

  return {
    ...request.headers,
    host: target.host,
    "x-forwarded-host": request.headers.host ?? "",
    "x-forwarded-proto": isSecure ? "https" : "http",
    ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
  };
}

function unavailableMessage(target: URL) {
  return `Standalone Boards is unavailable at ${target.origin}. Start the local workspace with npm run dev:local.`;
}

function writeRawResponse(socket: Duplex, response: IncomingMessage) {
  const statusCode = response.statusCode ?? 502;
  const statusMessage = response.statusMessage ?? "Bad Gateway";
  const rawHeaders = response.rawHeaders;
  const lines = [`HTTP/${response.httpVersion} ${statusCode} ${statusMessage}`];

  for (let index = 0; index < rawHeaders.length; index += 2) {
    lines.push(`${rawHeaders[index]}: ${rawHeaders[index + 1]}`);
  }

  socket.write(`${lines.join("\r\n")}\r\n\r\n`);
}

function writeUpgradeError(socket: Duplex, target: URL) {
  const body = unavailableMessage(target);
  socket.write(
    `HTTP/1.1 503 Service Unavailable\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`,
  );
  socket.destroy();
}

function writeUpgradeUnauthorized(socket: Duplex) {
  const body = "Authentication required";
  socket.write(
    `HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`,
  );
  socket.destroy();
}

async function hasAuthenticatedUpgradeSession(
  request: IncomingMessage,
  socket: Duplex,
  sessionMiddleware: RequestHandler,
): Promise<boolean> {
  const sessionRequest = request as Request;
  const sessionResponse = new ServerResponse(request);
  const netSocket = socket as unknown as Socket;
  sessionResponse.assignSocket(netSocket);

  try {
    await new Promise<void>((resolve, reject) => {
      sessionMiddleware(
        sessionRequest,
        sessionResponse as unknown as Response,
        (error?: unknown) => (error ? reject(error) : resolve()),
      );
    });

    const userId = sessionRequest.session?.userId;
    return Boolean(userId && await storage.getUser(userId));
  } catch {
    return false;
  } finally {
    sessionResponse.detachSocket(netSocket);
  }
}

/**
 * Locally, LedgerLM owns the browser origin and forwards the embedded Boards
 * path to Next.js. Replit already provides this routing, so the bridge is
 * enabled only when STANDALONE_BOARDS_URL is explicitly set.
 */
export type StandaloneBoardsProxy = {
  attachUpgradeHandler(server: Server): void;
};

export function registerStandaloneBoardsProxy(
  app: Express,
  csrfProtection: RequestHandler,
  sessionMiddleware: RequestHandler,
): StandaloneBoardsProxy | null {
  const target = getProxyTarget();
  if (!target) return null;

  app.use(STANDALONE_BOARDS_PATH, requireAuth, csrfProtection, (request: Request, response: Response) => {
    const upstream = target.request(
      {
        protocol: target.url.protocol,
        hostname: target.url.hostname,
        port: target.url.port || undefined,
        method: request.method,
        path: request.originalUrl,
        headers: forwardedHeaders(request, target.url),
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );

    upstream.on("error", () => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.status(503).json({ error: unavailableMessage(target.url) });
    });

    request.pipe(upstream);
  });

  console.log(`[standalone] proxying ${STANDALONE_BOARDS_PATH} to ${target.url.origin}`);
  return {
    attachUpgradeHandler(server) {
      server.on("upgrade", async (request, socket, head) => {
        // Next's dev server only needs a WebSocket for HMR. Restricting this
        // raw upgrade bridge prevents other socket traffic from reaching the
        // internal Boards server.
        if (!isStandaloneBoardsHmrPath(request.url)) return;
        if (!await hasAuthenticatedUpgradeSession(request, socket, sessionMiddleware)) {
          writeUpgradeUnauthorized(socket);
          return;
        }

        const upstream = target.request({
          protocol: target.url.protocol,
          hostname: target.url.hostname,
          port: target.url.port || undefined,
          method: request.method,
          path: request.url,
          headers: forwardedHeaders(request, target.url),
        });

        upstream.on("upgrade", (upstreamResponse, upstreamSocket, upstreamHead) => {
          writeRawResponse(socket, upstreamResponse);
          if (head.length) upstreamSocket.write(head);
          if (upstreamHead.length) socket.write(upstreamHead);

          upstreamSocket.on("error", () => socket.destroy());
          socket.on("error", () => upstreamSocket.destroy());
          upstreamSocket.pipe(socket);
          socket.pipe(upstreamSocket);
        });

        upstream.on("response", (upstreamResponse) => {
          writeRawResponse(socket, upstreamResponse);
          upstreamResponse.pipe(socket);
          upstreamResponse.on("end", () => socket.destroy());
        });

        upstream.on("error", () => writeUpgradeError(socket, target.url));
        upstream.end();
      });
    },
  };
}