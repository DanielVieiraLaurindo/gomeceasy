import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    console.log('manage-users: request received', req.method)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller via direct auth API call
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado - sem token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '',
      }
    })
    console.log('Auth API status:', authRes.status)
    if (!authRes.ok) {
      const errText = await authRes.text()
      console.log('Auth API error:', errText)
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const caller = await authRes.json()
    console.log('Caller id:', caller.id)

    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', caller.id).single()
    console.log('callerProfile role:', callerProfile?.role)
    if (!callerProfile || !['master', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Apenas master/admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action } = body
    console.log('action:', action)

    if (action === 'create_user') {
      const { email, password, nome, setor, role, login_username } = body
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, setor },
      })
      if (error) {
        console.error('createUser error:', JSON.stringify(error))
        return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${error.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (data.user) {
        const updates: any = { role: role || 'usuario', setor: setor || 'backoffice' }
        if (login_username) updates.login_username = login_username
        await supabaseAdmin.from('profiles').update(updates).eq('id', data.user.id)
      }

      await supabaseAdmin.from('activity_log').insert({
        usuario_id: caller.id,
        acao: 'criar_usuario',
        tabela: 'profiles',
        detalhes: { email, nome, setor, role }
      })

      return new Response(JSON.stringify({ success: true, user_id: data.user?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'reset_password') {
      const { user_id, new_password } = body
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password })
      if (error) {
        console.error('reset_password error:', error.message)
        return new Response(JSON.stringify({ error: 'Erro ao redefinir senha' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await supabaseAdmin.from('activity_log').insert({
        usuario_id: caller.id, acao: 'redefinir_senha', tabela: 'profiles',
        detalhes: { target_user_id: user_id }
      })

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'toggle_active') {
      const { user_id, ativo } = body
      await supabaseAdmin.from('profiles').update({ ativo }).eq('id', user_id)
      
      if (!ativo) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: 'none' })
      }

      await supabaseAdmin.from('activity_log').insert({
        usuario_id: caller.id, acao: ativo ? 'ativar_usuario' : 'desativar_usuario', tabela: 'profiles',
        detalhes: { target_user_id: user_id, ativo }
      })

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update_user') {
      const { user_id, nome, setor, role } = body
      const updates: any = {}
      if (nome) updates.nome = nome
      if (setor) updates.setor = setor
      if (role) updates.role = role
      
      await supabaseAdmin.from('profiles').update(updates).eq('id', user_id)

      await supabaseAdmin.from('activity_log').insert({
        usuario_id: caller.id, acao: 'atualizar_usuario', tabela: 'profiles',
        detalhes: { target_user_id: user_id, ...updates }
      })

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('manage-users error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})