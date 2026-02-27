import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

    // Webhooks typically send 'topic' and 'id' or 'action' and 'data.id'
    const paymentId = payload.data?.id || payload.id;
    const topic = payload.action || payload.topic;

    if (!paymentId || topic !== 'payment.created') {
      return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 })
    }

    // 1. Fetch real payment details securely from MP to prevent spoofing
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error('Failed to verify payment with MP API');
    }

    const paymentData = await mpResponse.json();

    // 2. Process only approved payments
    if (paymentData.status === 'approved') {
      const companyId = paymentData.external_reference; // We passed this when creating the subscription

      if (!companyId) throw new Error('No companyId attached to payment via external_reference');

      const amount = paymentData.transaction_amount;

      // 3. Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // We need service role for admin DB edits
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      // 4. Calculate new expiration (assume +1 month for now, refine based on your plan struct)
      const newExpiration = new Date();
      newExpiration.setMonth(newExpiration.getMonth() + 1);

      // 5. Save the payment record
      const { error: insertError } = await supabase
        .from('company_payments')
        .insert({
          company_id: companyId,
          amount: amount,
          plan_reference: paymentData.description || 'Assinatura',
          expires_at_after: newExpiration.toISOString(),
        });

      if (insertError) throw insertError;

      // 6. Update company's expiration and status
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          expires_at: newExpiration.toISOString(),
          status: 'ACTIVE'
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      console.log(`Company ${companyId} renewed successfully until ${newExpiration.toISOString()}`);
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
