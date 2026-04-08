import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(body));

    const callback = body?.Body?.stkCallback;
    if (!callback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (ResultCode === 0) {
      // Payment successful
      let receiptNumber = "";
      if (CallbackMetadata?.Item) {
        const receiptItem = CallbackMetadata.Item.find(
          (i: { Name: string; Value?: string }) => i.Name === "MpesaReceiptNumber"
        );
        if (receiptItem) receiptNumber = receiptItem.Value || "";
      }

      await supabase
        .from("orders")
        .update({ status: "paid", mpesa_receipt_number: receiptNumber })
        .eq("mpesa_checkout_request_id", CheckoutRequestID);
    } else {
      // Payment failed
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("mpesa_checkout_request_id", CheckoutRequestID);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
