import { readFile } from "fs/promises";
import path from "path";

// Serves the Apple Pay / Paystack domain-association file. A next.config rewrite
// maps /.well-known/apple-developer-merchantid-domain-association here as a
// fallback in case static serving of the dotfile directory is unavailable.
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public/.well-known/apple-developer-merchantid-domain-association");
    const content = await readFile(filePath, "utf8");
    return new Response(content, { headers: { "Content-Type": "text/plain" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
