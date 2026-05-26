// Slack webhook helper. Falls back to a no-op if SLACK_WEBHOOK_URL is unset
// so dev runs don't blow up.

export async function postSlack(text: string, webhookUrl?: string): Promise<boolean> {
  const url = webhookUrl ?? Deno.env.get("SLACK_WEBHOOK_URL");
  if (!url) {
    console.log(`[slack-stub] would post: ${text}`);
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (err) {
    console.error(`[slack] post failed: ${(err as Error).message}`);
    return false;
  }
}
