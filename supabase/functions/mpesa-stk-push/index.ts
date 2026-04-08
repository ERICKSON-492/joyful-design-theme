import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DARAJA_AUTH_URL = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const DARAJA_STK_URL = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const DARAJA_QUERY_URL = "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return new Response(JSON.stringify({ error: "M-Pesa credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "push";

    // Get OAuth token
    const authRes = await fetch(DARAJA_AUTH_URL, {
      headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to authenticate with Daraja", details: authData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = authData.access_token;

    if (action === "query") {
      // Query STK push status
      const { checkout_request_id } = await req.json();
      if (!checkout_request_id) {
        return new Response(JSON.stringify({ error: "checkout_request_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
      const password = btoa(`${shortcode}${passkey}${timestamp}`);

      const queryRes = await fetch(DARAJA_QUERY_URL, {
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

      // Update order status if successful
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

    // Format phone: ensure 254XXXXXXXXX
    let formattedPhone = phone.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "");
    if (!formattedPhone.startsWith("254")) formattedPhone = "254" + formattedPhone;

    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    const stkRes = await fetch(DARAJA_STK_URL, {
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
