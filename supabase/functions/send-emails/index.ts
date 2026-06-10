import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { Resend } from 'npm:resend@2.0.0';

// Initialize Resend with your API key (add to secrets)
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Email processing function
async function sendEmail(recipient: string, subject: string, html: string): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Ushanga Chronicles <orders@ushangachronicles.com>',
      to: [recipient],
      subject: subject,
      html: html,
    });
    
    if (error) {
      console.error('Resend error:', error);
      return false;
    }
    
    console.log('Email sent:', data);
    return true;
  } catch (error) {
    console.error('Send error:', error);
    return false;
  }
}

// Main edge function handler
Deno.serve(async (req) => {
  // Handle different request types
  const url = new URL(req.url);
  
  // Process single email (called from checkout)
  if (req.method === 'POST' && url.pathname === '/send') {
    try {
      const { to, subject, html } = await req.json();
      const success = await sendEmail(to, subject, html);
      
      return new Response(
        JSON.stringify({ success, message: success ? 'Email sent' : 'Failed to send' }),
        { status: success ? 200 : 500 }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 }
      );
    }
  }
  
  // Process queue (called by cron or manually)
  if (req.method === 'POST' && url.pathname === '/process-queue') {
    try {
      // Get pending emails
      const { data: emails, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', 3) // Max 3 retries
        .order('created_at', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      
      const results = [];
      for (const email of emails) {
        console.log(`Processing email ${email.id} to ${email.recipient}`);
        
        const sent = await sendEmail(email.recipient, email.subject, email.html);
        
        if (sent) {
          // Update as sent
          await supabase
            .from('email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);
          results.push({ id: email.id, status: 'sent' });
        } else {
          // Update retry count
          await supabase
            .from('email_queue')
            .update({ 
              retry_count: email.retry_count + 1,
              status: email.retry_count + 1 >= 3 ? 'failed' : 'pending'
            })
            .eq('id', email.id);
          results.push({ id: email.id, status: 'failed' });
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { status: 200 }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 }
      );
    }
  }
  
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405 }
  );
});
