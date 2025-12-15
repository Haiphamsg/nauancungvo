/* eslint-disable no-console */
const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function checkHealth() {
  const res = await fetch(`${baseUrl}/api/health`);
  if (!res.ok) throw new Error(`/api/health failed: ${res.status}`);
  const json = await res.json();
  console.log("Health:", json);
}

async function checkRecommend() {
  const res = await fetch(`${baseUrl}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_keys: ["chicken", "onion"],
      prefer_tag: "weekday",
      limit_n: 2,
      missing_core_allow: 1,
    }),
  });
  if (!res.ok) throw new Error(`/api/recommend failed: ${res.status}`);
  const json = await res.json();
  console.log("Recommend:", json);
}

async function main() {
  try {
    await checkHealth();
    await checkRecommend();
    console.log("Smoke tests completed");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exitCode = 1;
  }
}

main();
