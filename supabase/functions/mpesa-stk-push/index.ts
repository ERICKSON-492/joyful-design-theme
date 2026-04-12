import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SANDBOX_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const SANDBOX_STK_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const SANDBOX_QUERY_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";
const PROD_AUTH_URL = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const PROD_STK_URL = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const PROD_QUERY_URL = "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";

async function getMpesaConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from("payment_methods")
    .select("config")
    .eq("provider", "mpesa")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!data?.config) {
    // Fallback to env vars for backward compatibility
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    if (consumerKey && consumerSecret && shortcode && passkey) {
      return { consumer_key: consumerKey, consumer_secret: consumerSecret, shortcode, passkey, environment: "sandbox" };
    }
    return null;
  }

  const cfg = data.config as Record<string, string>;
  if (!cfg.consumer_key || !cfg.consumer_secret || !cfg.shortcode || !cfg.passkey) {
    return null;
  }
  return cfg;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const config = await getMpesaConfig();
    if (!config) {
      return new Response(JSON.stringify({ error: "M-Pesa credentials not configured. Add them in Admin → Payments." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { consumer_key, consumer_secret, shortcode, passkey, environment } = config;
    const isProd = environment === "production";
    const authUrl = isProd ? PROD_AUTH_URL : SANDBOX_AUTH_URL;
    const stkUrl = isProd ? PROD_STK_URL : SANDBOX_STK_URL;
    const queryUrl = isProd ? PROD_QUERY_URL : SANDBOX_QUERY_URL;

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "push";

    // Get OAuth token
    const authRes = await fetch(authUrl, {
      headers: { Authorization: `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}` },
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to authenticate with Daraja", details: authData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = authData.access_token;

    if (action === "query") {
      const { checkout_request_id } = await req.json();
      if (!checkout_request_id) {
        return new Response(JSON.stringify({ error: "checkout_request_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
      const password = btoa(`${shortcode}${passkey}${timestamp}`);

      const queryRes = await fetch(queryUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkout_request_id,
        }),
      });
      const queryData = await queryRes.json();

      if (queryData.ResultCode === "0" || queryData.ResultCode === 0) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from("orders")
          .update({
            status: "paid",
            mpesa_receipt_number: queryData.MpesaReceiptNumber || null,
          })
          .eq("mpesa_checkout_request_id", checkout_request_id);
      }

      return new Response(JSON.stringify(queryData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STK Push
    const { phone, amount, order_id } = await req.json();
    if (!phone || !amount) {
      return new Response(JSON.stringify({ error: "phone and amount are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedPhone = phone.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "");
    if (!formattedPhone.startsWith("254")) formattedPhone = "254" + formattedPhone;

    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    const stkRes = await fetch(stkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: "UshangaChronicles",
        TransactionDesc: `Payment for order`,
      }),
    });
    const stkData = await stkRes.json();

    if (stkData.ResponseCode === "0" && order_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("orders")
        .update({ mpesa_checkout_request_id: stkData.CheckoutRequestID })
        .eq("id", order_id);
    }

    return new Response(JSON.stringify(stkData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
