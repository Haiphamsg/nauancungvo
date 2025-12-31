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

async function checkIngredients() {
  const res = await fetch(`${baseUrl}/api/ingredients`);
  if (!res.ok) throw new Error(`/api/ingredients failed: ${res.status}`);
  const json = await res.json();
  const first = json?.items?.[0];
  if (first) {
    if (typeof first.key !== "string") throw new Error("ingredients.item.key missing");
    if (typeof first.display_name !== "string")
      throw new Error("ingredients.item.display_name missing");
    if (typeof first.group !== "string") throw new Error("ingredients.item.group missing");
    if (typeof first.is_core_default !== "boolean")
      throw new Error("ingredients.item.is_core_default missing");
  }
  console.log("Ingredients:", { count: json?.items?.length ?? 0, sample: first ?? null });
}

async function main() {
  try {
    await checkHealth();
    await checkRecommend();
    await checkIngredients();
    console.log("Smoke tests completed");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exitCode = 1;
  }
}

main();
