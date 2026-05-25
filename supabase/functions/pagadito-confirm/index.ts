// @ts-nocheck — Runs on Deno (Supabase Edge Functions), not Node.
// Supabase Edge Function: pagadito-confirm

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGADITO_UID = Deno.env.get("PAGADITO_UID");
const PAGADITO_WSK = Deno.env.get("PAGADITO_WSK");
const PAGADITO_BASE = "https://sandbox.pagadito.com/comercios/apipg/charges.php";

const OP_CONNECT = "f3f191ce3326905ff4403bb05b0de150";
const OP_GET_STATUS = "0b50820c65b0de71ce78f6221a5cf876";

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

// Verify payment state with Pagadito
async function getPaymentState(sessionToken: string, transactionToken: string): Promise<any> {
  const params = new URLSearchParams();
  params.append("operation", OP_GET_STATUS);
  params.append("token", sessionToken);
  params.append("token_trans", transactionToken);
  params.append("format_return", "json");

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
  return data;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!PAGADITO_UID || !PAGADITO_WSK) {
      return json({ error: "Pagadito credentials not configured" }, 500);
    }

    const { token, clinicId } = await req.json();

    if (!token || !clinicId) {
      return json({ error: "token and clinicId are required" }, 400);
    }

    // Connect first
    const sessionToken = await connectToPagadito();

    // Verify with Pagadito
    const paymentData = await getPaymentState(sessionToken, token);

    // PG1003 = COMPLETED, PG1004 = PENDING, PG1005 = CANCELLED
    // Para extrema seguridad, verificamos también el estado interno en 'value'
    const pgCode = paymentData.code;
    const innerStatus = paymentData?.value?.status?.toUpperCase();

    // En Pagadito, el estatus real de pago exitoso es COMPLETED (y a veces PG1003 como código general)
    const isCompleted = pgCode === "PG1003" && (!innerStatus || innerStatus === "COMPLETED");
    const isPending   = pgCode === "PG1004" || innerStatus === "REGISTERED" || innerStatus === "VERIFYING";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json({ error: "Supabase not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (isCompleted) {
      // Activate subscription for 30 days
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      const { error } = await supabase.from("subscriptions").upsert({
        clinic_id: clinicId,
        status: "active",
        plan: "monthly",
        amount: 15.00,
        currency: "USD",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        pagadito_token: token,
        last_payment_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "clinic_id" });

      if (error) {
        console.error("Supabase upsert error:", error);
        return json({ error: "Error updating subscription" }, 500);
      }

      return json({
        success: true,
        status: "active",
        periodEnd: periodEnd.toISOString(),
        message: "¡Pago confirmado! Tu suscripción está activa.",
      });
    }

    if (isPending) {
      return json({ success: false, status: "pending", message: "Pago pendiente de confirmación." });
    }

    // Cancelled or unknown
    await supabase.from("subscriptions").upsert({
      clinic_id: clinicId,
      status: "inactive",
      pagadito_token: token,
      updated_at: new Date().toISOString(),
    }, { onConflict: "clinic_id" });

    return json({ success: false, status: "cancelled", message: "El pago fue cancelado." });
  } catch (err) {
    console.error("pagadito-confirm error:", err);
    return json({ error: err.message || "Error interno" }, 500);
  }
});

