// @ts-nocheck — Runs on Deno (Supabase Edge Functions), not Node.
// Supabase Edge Function: pagadito-checkout

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGADITO_UID = Deno.env.get("PAGADITO_UID");
const PAGADITO_WSK = Deno.env.get("PAGADITO_WSK");
// Use Sandbox endpoint
const PAGADITO_BASE = "https://sandbox.pagadito.com/comercios/apipg/charges.php";

const OP_CONNECT = "f3f191ce3326905ff4403bb05b0de150";
const OP_EXEC = "41216f8caf94aaa598db137e36d4673e";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function connectToPagadito(): Promise<string> {
  const params = new URLSearchParams();
  params.append("operation", OP_CONNECT);
  params.append("uid", PAGADITO_UID!);
  params.append("wsk", PAGADITO_WSK!);
  params.append("format_return", "json");

  const res = await fetch(PAGADITO_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await res.json();

  if (data.code !== "PG1001") {
    throw new Error(`Pagadito connect failed: ${data.code} - ${data.message}`);
  }
  return data.value;
}

async function execTransaction(
  token: string,
  amount: number,
  description: string,
  customParam: string
): Promise<string> {
  const params = new URLSearchParams();
  params.append("operation", OP_EXEC);
  params.append("token", token);
  params.append("ern", `DL-${Date.now()}`);
  params.append("amount", amount.toFixed(2));
  params.append("currency", "USD");
  params.append("format_return", "json");
  params.append("allow_pending_payments", "false");
  // Enviar explícitamente la URL de retorno hacia la versión en producción,
  // ya que Pagadito bloquea redirecciones a localhost por seguridad (403 Forbidden).
  params.append("return_url", "https://dientelink.vercel.app/#/payment-success");

  const details = [{
    quantity: 1,
    description,
    price: amount.toFixed(2),
    url_product: ""
  }];
  params.append("details", JSON.stringify(details));

  const customParams = { param1: customParam };
  params.append("custom_params", JSON.stringify(customParams));

  const res = await fetch(PAGADITO_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Pagadito returned invalid JSON: ${text.substring(0, 100)}`);
  }

  if (data.code !== "PG1002") {
    throw new Error(`Pagadito exec failed: ${data.code} - ${data.message}`);
  }
  // data.value contains the URL to redirect the user
  // We need to decode it just in case
  return decodeURIComponent(data.value);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!PAGADITO_UID || !PAGADITO_WSK) {
      return json({ error: "Pagadito credentials not configured" }, 500);
    }

    const { clinicId, amount = 15.00, description = "Suscripcion mensual DienteLink" } = await req.json();

    if (!clinicId) {
      return json({ error: "clinicId is required" }, 400);
    }

    const token = await connectToPagadito();
    const paymentUrl = await execTransaction(token, amount, description, clinicId);

    // Extract the transaction token from the returned URL
    let tokenTrans = token;
    try {
      const urlObj = new URL(paymentUrl);
      const extractedToken = urlObj.searchParams.get("token");
      if (extractedToken) {
        tokenTrans = extractedToken;
      }
    } catch (e) {
      console.error("Error parsing paymentUrl:", e);
    }

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await supabase.from("subscriptions").upsert({
        clinic_id: clinicId,
        status: "pending",
        plan: "monthly",
        amount,
        currency: "USD",
        pagadito_token: tokenTrans, // We store the actual transaction token for verification
        updated_at: new Date().toISOString(),
      }, { onConflict: "clinic_id" });
    }

    return json({ paymentUrl, token: tokenTrans });
  } catch (err) {
    console.error("pagadito-checkout error:", err);
    return json({ error: err.message || "Error interno" }, 500);
  }
});

