const PAGADITO_UID = '4e454721b3d24e0d8f74627003e9a7a5';
const PAGADITO_WSK = '15afac5227fa55f552393bcd4bb12ffe';
const PAGADITO_BASE = 'https://sandbox.pagadito.com/comercios/apipg/charges.php';
const OP_CONNECT = 'f3f191ce3326905ff4403bb05b0de150';
const OP_EXEC = '41216f8caf94aaa598db137e36d4673e';

async function test() {
  // 1. Connect
  const p1 = new URLSearchParams();
  p1.append("operation", OP_CONNECT);
  p1.append("uid", PAGADITO_UID);
  p1.append("wsk", PAGADITO_WSK);
  p1.append("format_return", "json");

  const r1 = await fetch(PAGADITO_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: p1.toString()
  });
  const data1 = await r1.json();
  const token = data1.value;
  console.log("Connect token:", token);

  // 2. Exec with different details variations
  const amount = 15.00;
  
  const payload = {
    operation: OP_EXEC,
    token: token,
    ern: `DL-${Date.now()}`,
    amount: amount, // Number instead of string
    currency: "USD",
    format_return: "json",
    allow_pending_payments: "false",
    details: JSON.stringify([{
      quantity: 1,
      description: "Suscripcion mensual",
      price: amount, // Number instead of string
      url_product: ""
    }]),
    custom_params: JSON.stringify({ clinicId: "12345" })
  };

  const p2 = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) {
    p2.append(k, String(v));
  }

  const r2 = await fetch(PAGADITO_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: p2.toString()
  });
  const data2 = await r2.json();
  console.log("Exec result:", data2);
}

test().catch(console.error);
