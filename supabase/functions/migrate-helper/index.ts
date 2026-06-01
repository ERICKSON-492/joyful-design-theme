Deno.serve(async (req) => {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'migrate-helper is running' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
