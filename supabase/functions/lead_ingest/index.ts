// Supabase Edge Function: lead_ingest
// Recebe dados do cadastro online e cria customer + application
// com commercial_stage = 'entrada'.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LeadPayload = {
  company_id: string;
  customer: {
    full_name: string;
    cpf?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    birth_date?: string; // YYYY-MM-DD
    address?: {
      street?: string;
      number?: string;
      district?: string;
      city?: string;
      uf?: string;
      cep?: string;
      complement?: string;
    };
  };
  application?: {
    received_at?: string; // ISO
    due_at?: string; // ISO
    comments?: string;
  };
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const secret = Deno.env.get('LEAD_INGEST_TOKEN') || '';
    if (!secret || token !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body: LeadPayload = await req.json();
    if (!body?.company_id || !body?.customer?.full_name) {
      return new Response('Invalid payload', { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // 1) Criar customer
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .insert({
        full_name: body.customer.full_name,
        cpf: body.customer.cpf || null,
        phone: body.customer.phone || null,
        whatsapp: body.customer.whatsapp || null,
        email: body.customer.email || null,
        birth_date: body.customer.birth_date || null,
        // Campos de endereço caso existam
        street: body.customer.address?.street || null,
        number: body.customer.address?.number || null,
        district: body.customer.address?.district || null,
        city: body.customer.address?.city || null,
        uf: body.customer.address?.uf || null,
        cep: body.customer.address?.cep || null,
        complement: body.customer.address?.complement || null,
      })
      .select()
      .single();

    if (cErr) throw cErr;

    // Datas padrão
    const now = new Date();
    const defaultReceivedAt = now.toISOString();
    const defaultDue = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 2) Criar application com commercial_stage = 'entrada'
    const { data: app, error: aErr } = await supabase
      .from('applications')
      .insert({
        company_id: body.company_id,
        customer_id: customer.id,
        status: 'recebido',
        received_at: body.application?.received_at || defaultReceivedAt,
        due_at: body.application?.due_at || defaultDue,
        comments: body.application?.comments || 'Origem: cadastro online',
        commercial_stage: 'entrada',
      })
      .select('id')
      .single();

    if (aErr) throw aErr;

    return new Response(JSON.stringify({ application_id: app.id }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('lead_ingest error', err);
    return new Response('Server error', { status: 500 });
  }
});

