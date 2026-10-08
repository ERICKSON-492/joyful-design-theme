const CUSTOMER_PATH = /^\/api\/admin\/customers(?:\/([^/]+))?$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Admin-only customer list and lifecycle operations. */
export async function handleAdminCustomers({ pool, req, res, url, json, body, isAdmin }) {
  const match = url.pathname.match(CUSTOMER_PATH)
  if (!match) return null
  if (!isAdmin) return json(res, 403, { error: 'Admin access required' })

  const customerId = match[1] ? decodeURIComponent(match[1]) : null
  if (customerId && !UUID.test(customerId)) return json(res, 400, { error: 'Invalid customer ID' })

  if (req.method === 'GET' && !customerId) {
    const result = await pool.query(`
      SELECT u.id AS user_id,
             u.email,
             COALESCE(NULLIF(u.display_name, ''), p.display_name) AS display_name,
             p.phone,
             u.created_at,
             u.is_active,
             COALESCE(o.order_count, 0)::int AS order_count
      FROM public.auth_users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      LEFT JOIN (
        SELECT user_id, count(*) AS order_count
        FROM public.joyful_orders
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) o ON o.user_id = u.id
      WHERE u.role = 'user'
        AND NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = u.id)
      ORDER BY u.created_at DESC
    `)
    return json(res, 200, { customers: result.rows })
  }

  if (!customerId) return json(res, 405, { error: 'Method not allowed' })

  if (req.method === 'PATCH') {
    const payload = (await body(req)) || {}
    if (payload.action !== 'archive' && payload.action !== 'restore') {
      return json(res, 400, { error: 'Action must be archive or restore' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const active = payload.action === 'restore'
      const result = await client.query(
        `UPDATE public.auth_users u
         SET is_active=$2, updated_at=now()
         WHERE u.id=$1::uuid AND u.role='user'
           AND NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=u.id)
         RETURNING u.id, u.is_active`,
        [customerId, active],
      )
      if (!result.rowCount) {
        await client.query('ROLLBACK')
        return json(res, 404, { error: 'Customer not found' })
      }
      if (!active) {
        // Archived accounts cannot keep using an existing session or reset link.
        await client.query('DELETE FROM public.auth_sessions WHERE user_id=$1::uuid', [customerId])
        await client.query('DELETE FROM public.auth_reset_tokens WHERE user_id=$1::uuid', [customerId])
      }
      await client.query('COMMIT')
      return json(res, 200, { ok: true, is_active: active })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  if (req.method === 'DELETE') {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const target = await client.query(
        `SELECT u.id, u.email FROM public.auth_users u
         WHERE u.id=$1::uuid AND u.role='user'
           AND NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=u.id)
         FOR UPDATE OF u`,
        [customerId],
      )
      if (!target.rowCount) {
        await client.query('ROLLBACK')
        return json(res, 404, { error: 'Customer not found' })
      }
      const email = target.rows[0].email

      // Keep the transaction record for bookkeeping, but remove direct account,
      // contact, and delivery identifiers from linked orders.
      const orders = await client.query(
        `UPDATE public.joyful_orders
         SET customer_name='Removed customer', phone='', email=NULL,
             shipping_address=NULL, receipt_url=NULL, user_id=NULL
         WHERE user_id=$1::uuid
         RETURNING id`,
        [customerId],
      )
      if (orders.rows.length) {
        const orderIds = orders.rows.map(row => row.id)
        await client.query(
          'DELETE FROM public.order_email_notifications WHERE order_id = ANY($1::uuid[])',
          [orderIds],
        )
      }

      // Preserve review text/rating, while removing the account link and author
      // name. Customer-uploaded review photos are no longer referenced.
      await client.query(
        `UPDATE public.product_reviews
         SET customer_name='Customer', user_id=NULL, photo_urls=ARRAY[]::text[], updated_at=now()
         WHERE user_id=$1::uuid`,
        [customerId],
      )
      await client.query(
        `UPDATE public.tribe_looks
         SET user_id=NULL, name='Community member'
         WHERE user_id=$1::uuid`,
        [customerId],
      )
      await client.query('DELETE FROM public.profiles WHERE user_id=$1::uuid', [customerId])

      if (email) {
        // Scrub other directly email-linked messages. Keep suppression records
        // so an opted-out address is not accidentally mailed in the future.
        await client.query(
          `UPDATE public.contact_messages
           SET name='Removed customer', email=NULL, phone=NULL, message='Message removed'
           WHERE lower(email)=lower($1)`,
          [email],
        )
        await client.query(
          `UPDATE public.custom_orders
           SET name='Removed customer', phone='', email=NULL, vision=NULL,
               colors=ARRAY[]::text[], materials=NULL, delivery_location=NULL,
               reference_image_urls=ARRAY[]::text[]
           WHERE lower(email)=lower($1)`,
          [email],
        )
        await client.query(
          `UPDATE public.enquiry_messages
           SET customer_name='Removed customer', customer_email=NULL,
               customer_phone=NULL, message='Message removed'
           WHERE lower(customer_email)=lower($1)`,
          [email],
        )
        await client.query('DELETE FROM public.newsletter_subscribers WHERE lower(email)=lower($1)', [email])
        await client.query('DELETE FROM public.email_unsubscribe_tokens WHERE lower(email)=lower($1)', [email])
        await client.query(
          `UPDATE public.email_send_log
           SET recipient_email=$2, metadata=NULL, error_message=NULL
           WHERE lower(recipient_email)=lower($1)`,
          [email, `removed+${customerId}@example.invalid`],
        )
        await client.query(
          `DELETE FROM public.email_outbox
           WHERE lower(recipient_email)=lower($1) AND status IN ('pending','queued')`,
          [email],
        )
        await client.query(
          `UPDATE public.email_outbox
           SET recipient_email=$2, subject='Message removed', html_body='', attachments='[]'::jsonb
           WHERE lower(recipient_email)=lower($1)`,
          [email, `removed+${customerId}@example.invalid`],
        )
      }

      await client.query('DELETE FROM public.auth_login_events WHERE user_id=$1::uuid OR lower(email)=lower($2)', [customerId, email || ''])
      await client.query('DELETE FROM public.auth_users WHERE id=$1::uuid', [customerId])
      await client.query('COMMIT')
      return json(res, 200, { ok: true, anonymizedOrders: orders.rowCount || 0 })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  return json(res, 405, { error: 'Method not allowed' })
}
