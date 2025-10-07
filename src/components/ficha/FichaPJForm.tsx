import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const pjSchema = z.object({
  empresa: z.object({
    razao: z.string().min(1, 'Obrigatório'),
    cnpj: z.string().min(14, 'CNPJ inválido'),
    abertura: z.string().optional(),
    fantasia: z.string().optional(),
    fachada: z.string().optional(),
    area: z.string().optional(),
  }),
  endereco: z.object({
    end: z.string().optional(), n: z.string().optional(), compl: z.string().optional(),
    tipo: z.enum(['Comércio Térreo', 'Comercio Sala', 'Casa']).optional(), obsTipo: z.string().optional(),
    cep: z.string().optional(), bairro: z.string().optional(), tempo: z.string().optional(),
    estab: z.enum(['Própria', 'Alugada', 'Cecida', 'Outro']).optional(), obsEstab: z.string().optional(),
    endPs: z.string().optional(),
  }),
  contatos: z.object({
    tel: z.string().optional(), whats: z.string().optional(), fonesOs: z.string().optional(), email: z.string().email().optional().or(z.literal('')),
  }),
  docs: z.object({
    comprovante: z.enum(['Enviou', 'Não enviou']).optional(), tipo: z.enum(['Energia','Agua','Internet','Outro','XXX']).optional(), emNomeDe: z.string().optional(),
    possuiInternet: z.enum(['Sim','Não']).optional(), operadora: z.string().optional(), plano: z.string().optional(), valor: z.string().optional(),
    contratoSocial: z.enum(['Sim','Não']).optional(), obsContrato: z.string().optional(),
  }),
  socios: z.array(z.object({ nome: z.string().optional(), cpf: z.string().optional(), tel: z.string().optional() })).default([]),
  solicitacao: z.object({
    quem: z.string().optional(), meio: z.string().optional(), tel: z.string().optional(),
    planoAcesso: z.enum(['A definir']).optional(), svaAvulso: z.enum(['A definir']).optional(), venc: z.enum(['5','10','15','20','25']).optional(),
  }),
  info: z.object({
    relevantes: z.string().optional(), spc: z.string().optional(), outrasPs: z.string().optional(), mk: z.string().optional(), parecerAnalise: z.string().optional(),
  }),
});

export type PJFormValues = z.infer<typeof pjSchema>;

interface FichaPJFormProps {
  defaultValues?: Partial<PJFormValues>;
  onSubmit: (values: PJFormValues) => Promise<void> | void;
  onCancel?: () => void;
  afterMkSlot?: React.ReactNode;
  onFormChange?: (values: PJFormValues) => void;
}

export function FichaPJForm({ defaultValues, onSubmit, onCancel, afterMkSlot, onFormChange }: FichaPJFormProps) {
  const form = useForm<PJFormValues>({ resolver: zodResolver(pjSchema), defaultValues });
  const changeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to form changes once and debounce notifications to the parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!onFormChange) return;
      if (changeTimer.current) clearTimeout(changeTimer.current);
      changeTimer.current = setTimeout(() => {
        onFormChange(value as PJFormValues);
      }, 250);
    });
    return () => {
      subscription.unsubscribe();
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
        changeTimer.current = null;
      }
    };
  }, [form, onFormChange]);
  const formatDateMaskAA = (value: string) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 6);
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 6);
    let out = d;
    if (m) out += '/' + m;
    if (y) out += '/' + y;
    return out;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="pj-form space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Dados cadastrais básicos */}
        <section>
          <h3 className="text-base font-semibold mb-3">Dados cadastrais básicos</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <FormField control={form.control} name="empresa.razao" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="empresa.cnpj" render={({ field }) => (
              <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="empresa.abertura" render={({ field }) => (
              <FormItem>
                <FormLabel>Abertura</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="dd/mm/aa"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(formatDateMaskAA(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="empresa.fantasia" render={({ field }) => (
              <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="empresa.fachada" render={({ field }) => (
              <FormItem><FormLabel>Nome na Fachada</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="empresa.area" render={({ field }) => (
              <FormItem className="md:col-span-3"><FormLabel>Área de Atuação</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
          </div>
        </section>

        {/* Endereço */}
        <section>
          <h3 className="text-base font-semibold mb-3">Endereço</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <FormField control={form.control} name="endereco.end" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>End</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="endereco.n" render={({ field }) => (
              <FormItem><FormLabel>Nº</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="endereco.compl" render={({ field }) => (
              <FormItem><FormLabel>Compl</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="endereco.tipo" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Comércio Térreo">Comércio Térreo</SelectItem>
                    <SelectItem value="Comercio Sala">Comercio Sala</SelectItem>
                    <SelectItem value="Casa">Casa</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="endereco.obsTipo" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />

            <FormField control={form.control} name="endereco.cep" render={({ field }) => (
              <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="endereco.bairro" render={({ field }) => (
              <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="endereco.tempo" render={({ field }) => (
              <FormItem><FormLabel>Tempo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />

            <FormField control={form.control} name="endereco.estab" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Estabelecimento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Própria">Própria</SelectItem>
                    <SelectItem value="Alugada">Alugada</SelectItem>
                    <SelectItem value="Cecida">Cecida</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="endereco.obsEstab" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />

            <FormField control={form.control} name="endereco.endPs" render={({ field }) => (
              <FormItem className="md:col-span-3"><FormLabel>End no PS</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
          </div>
        </section>

        {/* Contatos e Documentos */}
        <section>
          <h3 className="text-base font-semibold mb-3">Contatos & Documentos</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <FormField control={form.control} name="contatos.tel" render={({ field }) => (<FormItem><FormLabel>Tel</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="contatos.whats" render={({ field }) => (<FormItem><FormLabel>Whats</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="contatos.fonesOs" render={({ field }) => (<FormItem><FormLabel>Fones no OS</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="contatos.email" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>)} />

            <FormField control={form.control} name="docs.comprovante" render={({ field }) => (
              <FormItem><FormLabel>Comprovante</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Enviou">Enviou</SelectItem><SelectItem value="Não enviou">Não enviou</SelectItem></SelectContent></Select></FormItem>
            )} />
            <FormField control={form.control} name="docs.tipo" render={({ field }) => (
              <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Energia">Energia</SelectItem><SelectItem value="Agua">Água</SelectItem><SelectItem value="Internet">Internet</SelectItem><SelectItem value="Outro">Outro</SelectItem><SelectItem value="XXX">XXX</SelectItem></SelectContent></Select></FormItem>
            )} />
            <FormField control={form.control} name="docs.emNomeDe" render={({ field }) => (<FormItem><FormLabel>Em nome de</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />

            <FormField control={form.control} name="docs.possuiInternet" render={({ field }) => (
              <FormItem><FormLabel>Possui Internet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select></FormItem>
            )} />
            <FormField control={form.control} name="docs.operadora" render={({ field }) => (<FormItem><FormLabel>Operadora</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="docs.plano" render={({ field }) => (<FormItem><FormLabel>Plano</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="docs.valor" render={({ field }) => (<FormItem><FormLabel>Valor</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />

            <FormField control={form.control} name="docs.contratoSocial" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Contrato Social</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select></FormItem>
            )} />
            <FormField control={form.control} name="docs.obsContrato" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </div>
        </section>

        {/* Sócios */}
        <section>
          <h3 className="text-base font-semibold mb-3">Sócios</h3>
          {[0,1,2].map((idx) => (
            <div key={idx} className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-2">
              <FormField control={form.control} name={`socios.${idx}.nome` as const} render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name={`socios.${idx}.cpf` as const} render={({ field }) => (<FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name={`socios.${idx}.tel` as const} render={({ field }) => (<FormItem><FormLabel>Tel</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </div>
          ))}
        </section>

        {/* Solicitação */}
        <section>
          <h3 className="text-base font-semibold mb-3">Solicitação</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <FormField control={form.control} name="solicitacao.quem" render={({ field }) => (<FormItem><FormLabel>Quem solicitou</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="solicitacao.meio" render={({ field }) => (<FormItem><FormLabel>Meio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="solicitacao.tel" render={({ field }) => (<FormItem><FormLabel>Tel</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="solicitacao.planoAcesso" render={({ field }) => (
              <FormItem><FormLabel>Plano de Acesso</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="A definir" /></SelectTrigger></FormControl><SelectContent><SelectItem value="A definir">A definir</SelectItem></SelectContent></Select></FormItem>
            )} />
            <FormField control={form.control} name="solicitacao.svaAvulso" render={({ field }) => (
              <FormItem><FormLabel>SVA Avulso</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="A definir" /></SelectTrigger></FormControl><SelectContent><SelectItem value="A definir">A definir</SelectItem></SelectContent></Select></FormItem>
            )} />
            <FormField control={form.control} name="solicitacao.venc" render={({ field }) => (
              <FormItem><FormLabel>Venc</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl><SelectContent>{['5','10','15','20','25'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></FormItem>
            )} />
          </div>
        </section>

        {/* Text Areas equivalentes PF */}
        <section>
          <h3 className="text-base font-semibold mb-3">Informações relevantes da solicitação</h3>
          <FormField control={form.control} name="info.relevantes" render={({ field }) => (<FormItem><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>)} />
        </section>
        <section>
          <h3 className="text-base font-semibold mb-3">Consulta SPC/Serasa</h3>
          <FormField control={form.control} name="info.spc" render={({ field }) => (<FormItem><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>)} />
        </section>
        <section>
          <h3 className="text-base font-semibold mb-3">Outras informações relevantes do PS</h3>
          <FormField control={form.control} name="info.outrasPs" render={({ field }) => (<FormItem><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>)} />
        </section>
        <section>
          <h3 className="text-base font-semibold mb-3">Informações relevantes do MK</h3>
          <FormField control={form.control} name="info.mk" render={({ field }) => (<FormItem><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>)} />
        </section>
        {afterMkSlot}

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>}
          <Button type="submit" className="bg-[#018942] text-white">Salvar ficha PJ</Button>
        </div>
      </form>
    </Form>
  );
}
