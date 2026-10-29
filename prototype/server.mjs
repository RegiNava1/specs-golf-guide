import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const prototypeDirectory = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = resolve(prototypeDirectory, "..");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".ts", "text/javascript; charset=utf-8"],
]);

function safeFilePath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const pathname = url.pathname === "/" ? "/prototype/index.html" : url.pathname;
  const filePath = resolve(repositoryRoot, `.${decodeURIComponent(pathname)}`);
  const pathFromRoot = relative(repositoryRoot, filePath);
  if (pathFromRoot.startsWith("..") || pathFromRoot.includes(":\\")) {
    return null;
  }
  return filePath;
}

const server = createServer(async (request, response) => {
  try {
    const filePath = safeFilePath(request.url ?? "/");
    if (filePath === null || !(await stat(filePath)).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }

    const extension = extname(filePath);
    const source = await readFile(filePath, "utf8");
    const body = extension === ".ts"
      ? stripTypeScriptTypes(source, { mode: "strip" })
      : source;

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes.get(extension) ?? "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    const statusCode = error?.code === "ENOENT" ? 404 : 500;
    response.writeHead(statusCode).end(
      statusCode === 404 ? "Not found" : "Local prototype server error",
    );
  }
});

server.listen(port, host, () => {
  console.log(`SPECS Golf Guide prototype: http://${host}:${port}`);
});
