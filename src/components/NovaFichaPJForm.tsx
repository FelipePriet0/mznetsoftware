import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const maskCNPJ = (v: string) => {
  const d = v.replace(/\D+/g, "").slice(0, 14);
  const p = [
    d.substring(0, 2),
    d.substring(2, 5),
    d.substring(5, 8),
    d.substring(8, 12),
    d.substring(12, 14),
  ];
  return p[0] && p[1] && p[2] && p[3] && p[4]
    ? `${p[0]}.${p[1]}.${p[2]}/${p[3]}-${p[4]}`
    : d;
};

const maskCPF = (v: string) => {
  const d = v.replace(/\D+/g, "").slice(0, 11);
  const p = [d.substring(0,3), d.substring(3,6), d.substring(6,9), d.substring(9,11)];
  return p[0] && p[1] && p[2] && p[3] ? `${p[0]}.${p[1]}.${p[2]}-${p[3]}` : d;
}

const maskPhone = (v: string) => {
  const d = v.replace(/\D+/g, "").slice(0,11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

const maskCEP = (v: string) => v.replace(/\D+/g, "").slice(0,8).replace(/(\d{5})(\d{0,3})/, "$1-$2");

const schema = z.object({
  corporate_name: z.string().min(1, "Obrigatório"),
  trade_name: z.string().min(1, "Obrigatório"),
  cnpj: z.string().min(18, "CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(14, "Telefone inválido"),
  contact_name: z.string().min(1, "Obrigatório"),
});

type PJForm = z.infer<typeof schema>;

interface NovaFichaPJFormProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (created: { id: string; title: string; cpf_cnpj?: string; phone?: string; email?: string; received_at?: string; applicant_id: string; }) => void;
  onBack?: () => void;
}

export default function NovaFichaPJForm({ open, onClose, onCreated, onBack }: NovaFichaPJFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const form = useForm<PJForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      corporate_name: "",
      trade_name: "",
      cnpj: "",
      email: "",
      phone: "",
      contact_name: "",
    }
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      // 1) Cria applicant PJ
      const { data: applicant, error: aErr1 } = await supabase
        .from('applicants')
        .insert({
          person_type: 'PJ',
          primary_name: values.corporate_name,
          cpf_cnpj: values.cnpj,
          phone: values.phone,
          email: values.email,
        })
        .select('id')
        .single();
      if (aErr1) throw aErr1;

      // 2) Detalhes PJ mínimos
      await supabase
        .from('pj_fichas')
        .insert({ applicant_id: applicant.id, trade_name: values.trade_name || null, contato_tecnico: values.contact_name });

      // 3) Card no Kanban (Comercial/entrada)
      const now = new Date();
      const { data: createdCard, error: cErr } = await supabase
        .from('kanban_cards')
        .insert({
          applicant_id: applicant.id,
          person_type: 'PJ',
          area: 'comercial',
          stage: 'entrada',
          assignee_id: null,
          title: values.corporate_name,
          cpf_cnpj: values.cnpj,
          phone: values.phone,
          email: values.email,
          received_at: now.toISOString(),
          source: 'software_pj',
        })
        .select('id, title, cpf_cnpj, phone, email, received_at')
        .single();
      if (cErr) throw cErr;

      toast({ title: 'Ficha PJ criada' });
      onCreated?.({
        id: createdCard.id,
        title: createdCard.title,
        cpf_cnpj: createdCard.cpf_cnpj ?? undefined,
        phone: createdCard.phone ?? undefined,
        email: createdCard.email ?? undefined,
        received_at: createdCard.received_at ?? undefined,
        applicant_id: applicant.id,
      });
      onClose();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || String(e), variant: 'destructive' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Dados Cadastrais Básicos</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6 mz-form">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField control={form.control} name="corporate_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="trade_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl><Input value={field.value} onChange={(e)=> field.onChange(maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input value={field.value} onChange={(e)=> field.onChange(maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo (contato)</FormLabel>
                  <FormControl><Input {...field} placeholder="Nome completo do contato" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              </section>
            

            <div className="flex justify-between pt-2">
              <Button type="button" variant="secondary" onClick={() => (onBack ? onBack() : onClose())}>Voltar</Button>
              <Button type="submit" className="bg-[#018942] text-white hover:-translate-y-0.5 hover:shadow-[0_10px_18px_rgba(0,0,0,0.25)]">Criar Ficha PJ</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
