// app/api/checkout/validate/route.ts or pages/api/checkout/validate.ts

import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin access
    );

    // Check each item's stock
    for (const item of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('stock, name')
        .eq('id', item.id)
        .single();

      if (error) {
        return Response.json(
          { error: `Error checking stock for ${item.id}` },
          { status: 500 }
        );
      }

      if (item.quantity > product.stock) {
        return Response.json(
          { 
            error: `Only ${product.stock} of "${product.name}" available. You requested ${item.quantity}.` 
          },
          { status: 400 }
        );
      }
    }

    // All stock checks passed
    return Response.json({ 
      success: true, 
      message: 'All items in stock' 
    });

  } catch (error) {
    return Response.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
