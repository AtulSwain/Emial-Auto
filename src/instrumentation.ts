// Runs once when the server boots. Validate configuration here so a missing
// variable fails loudly at startup instead of on the first invite.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("./lib/env");
    env();
  }
}
