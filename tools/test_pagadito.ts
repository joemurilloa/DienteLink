import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
const env = await load({ envPath: "./.env" });

const PAGADITO_UID = env["PAGADITO_UID"];
const PAGADITO_WSK = env["PAGADITO_WSK"];
const PAGADITO_BASE = "https://sandbox.pagadito.com/comercios/apipg/charges.php";

const OP_CONNECT = "f3f191ce3326905ff4403bb05b0de150";
const OP_EXEC = "41216f8caf94aaa598db137e36d4673e";
const OP_GET_STATUS = "0b50820c65b0de71ce78f6221a5cf876";

async function run() {
  // 1. Connect
  const p1 = new URLSearchParams();
  p1.append("operation", OP_CONNECT);
  p1.append("uid", PAGADITO_UID);
  p1.append("wsk", PAGADITO_WSK);
  p1.append("format_return", "json");

  const r1 = await fetch(PAGADITO_BASE, { method: "POST", body: p1.toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" }});
  const d1 = await r1.json();
  const sessionToken = d1.value;

  // 2. Exec (create pending tx)
  const p2 = new URLSearchParams();
  p2.append("operation", OP_EXEC);
  p2.append("token", sessionToken);
  p2.append("ern", "TEST-" + Date.now());
  p2.append("amount", "15.00");
  p2.append("currency", "USD");
  p2.append("format_return", "json");
  p2.append("details", JSON.stringify([{quantity: 1, description: "Test", price: "15.00", url_product: ""}]));

  const r2 = await fetch(PAGADITO_BASE, { method: "POST", body: p2.toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" }});
  const d2 = await r2.json();
  const paymentUrl = decodeURIComponent(d2.value);
  const urlObj = new URL(paymentUrl);
  const txToken = urlObj.searchParams.get("token");

  console.log("Created TX token:", txToken);

  // 3. Check status immediately (unpaid)
  const p3 = new URLSearchParams();
  p3.append("operation", OP_GET_STATUS);
  p3.append("token", sessionToken);
  p3.append("token_trans", txToken);
  p3.append("format_return", "json");

  const r3 = await fetch(PAGADITO_BASE, { method: "POST", body: p3.toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" }});
  const d3 = await r3.json();
  console.log("Status response:", JSON.stringify(d3, null, 2));
}

run();
