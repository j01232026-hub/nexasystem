// @ts-nocheck
// Edge Function for invite signup - creates confirmed user
// Runs in Deno environment, not Node.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  inviteToken: string;
}

serve(async (req: Request) => {
  try {
    const { email, password, name, inviteToken }: SignupRequest = await req.json()

    if (!email || !password || !inviteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Verify invite token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('staff')
      .select('*, roles(*)')
      .eq('invite_token', inviteToken)
      .eq('email', email)
      .gt('invite_expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Create user with admin API (auto-confirmed)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name,
        tenant_id: invite.tenant_id
      }
    })

    if (userError) {
      if (userError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Email already registered' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw userError
    }

    const userId = userData.user.id

    // 3. Update staff record
    const { error: updateError } = await supabaseAdmin
      .from('staff')
      .update({
        user_id: userId,
        joined_at: new Date().toISOString(),
        invite_token: null,
        invite_expires_at: null
      })
      .eq('id', invite.id)

    if (updateError) throw updateError

    // 4. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        tenant_id: invite.tenant_id,
        role: invite.roles?.name || 'staff',
        full_name: name,
        email: email
      })

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('Profile creation error:', profileError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: userId, email: email }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Invite signup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})