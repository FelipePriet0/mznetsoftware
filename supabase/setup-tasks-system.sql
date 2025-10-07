-- =====================================================
-- SISTEMA DE TAREFAS - MZNET
-- =====================================================
-- Este arquivo configura todo o sistema de tarefas:
-- 1. Tabela card_tasks
-- 2. RLS (Row Level Security) para permissões
-- 3. Triggers para auditoria
-- 4. Funções auxiliares
-- =====================================================

-- =====================================================
-- 1. CRIAR TABELA DE TAREFAS
-- =====================================================

-- Criar tabela card_tasks se não existir
CREATE TABLE IF NOT EXISTS public.card_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  card_title TEXT, -- Nome da ficha (denormalizado para facilitar buscas)
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  deadline TIMESTAMPTZ,
  comment_id UUID REFERENCES public.card_comments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Adicionar colunas se não existirem (para tabelas já criadas)
DO $$ 
BEGIN
  -- Adicionar card_title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'card_tasks' 
    AND column_name = 'card_title'
  ) THEN
    ALTER TABLE public.card_tasks ADD COLUMN card_title TEXT;
    RAISE NOTICE '✓ Coluna card_title adicionada à tabela card_tasks';
  ELSE
    RAISE NOTICE '✓ Coluna card_title já existe';
  END IF;

  -- Adicionar comment_id (se não existir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'card_tasks' 
    AND column_name = 'comment_id'
  ) THEN
    ALTER TABLE public.card_tasks ADD COLUMN comment_id UUID REFERENCES public.card_comments(id) ON DELETE SET NULL;
    RAISE NOTICE '✓ Coluna comment_id adicionada à tabela card_tasks';
  ELSE
    RAISE NOTICE '✓ Coluna comment_id já existe';
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_card_tasks_card_id ON public.card_tasks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tasks_card_title ON public.card_tasks(card_title); -- Para busca por nome da ficha
CREATE INDEX IF NOT EXISTS idx_card_tasks_assigned_to ON public.card_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_card_tasks_created_by ON public.card_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_card_tasks_status ON public.card_tasks(status);
CREATE INDEX IF NOT EXISTS idx_card_tasks_deadline ON public.card_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_card_tasks_created_at ON public.card_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_card_tasks_comment_id ON public.card_tasks(comment_id);

-- Adicionar comentário na tabela
COMMENT ON TABLE public.card_tasks IS 'Tarefas atribuídas entre colaboradores relacionadas a cards do Kanban';

-- Adicionar comentários nas colunas
COMMENT ON COLUMN public.card_tasks.id IS 'Identificador único da tarefa';
COMMENT ON COLUMN public.card_tasks.card_id IS 'ID do card relacionado';
COMMENT ON COLUMN public.card_tasks.card_title IS 'Nome da ficha (denormalizado para facilitar buscas e auditoria)';
COMMENT ON COLUMN public.card_tasks.created_by IS 'ID do usuário que criou a tarefa';
COMMENT ON COLUMN public.card_tasks.assigned_to IS 'ID do usuário responsável pela tarefa';
COMMENT ON COLUMN public.card_tasks.description IS 'Descrição da tarefa';
COMMENT ON COLUMN public.card_tasks.status IS 'Status da tarefa: pending ou completed';
COMMENT ON COLUMN public.card_tasks.deadline IS 'Prazo para conclusão da tarefa';
COMMENT ON COLUMN public.card_tasks.comment_id IS 'ID do comentário associado (conversa encadeada)';
COMMENT ON COLUMN public.card_tasks.created_at IS 'Data de criação da tarefa';
COMMENT ON COLUMN public.card_tasks.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.card_tasks.completed_at IS 'Data de conclusão da tarefa';

-- =====================================================
-- 2. CRIAR TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_card_tasks_updated_at ON public.card_tasks;
CREATE TRIGGER update_card_tasks_updated_at
  BEFORE UPDATE ON public.card_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. CRIAR TRIGGER PARA ATUALIZAR completed_at
-- =====================================================

-- Função para atualizar completed_at quando status muda para completed
CREATE OR REPLACE FUNCTION public.update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para 'completed', definir completed_at
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  
  -- Se status mudou de 'completed' para 'pending', limpar completed_at
  IF NEW.status = 'pending' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar completed_at
DROP TRIGGER IF EXISTS update_task_completed_at_trigger ON public.card_tasks;
CREATE TRIGGER update_task_completed_at_trigger
  BEFORE UPDATE ON public.card_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_completed_at();

-- =====================================================
-- 4. CRIAR TRIGGER PARA SETAR created_by AUTOMATICAMENTE
-- =====================================================

-- Função para setar created_by automaticamente com o usuário atual
CREATE OR REPLACE FUNCTION public.set_task_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Setar created_by com o usuário autenticado
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para setar created_by
DROP TRIGGER IF EXISTS set_task_created_by_trigger ON public.card_tasks;
CREATE TRIGGER set_task_created_by_trigger
  BEFORE INSERT ON public.card_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_created_by();

-- =====================================================
-- 4.1. CRIAR TRIGGER PARA PREENCHER card_title AUTOMATICAMENTE
-- =====================================================

-- Função para preencher card_title automaticamente com o título do card
CREATE OR REPLACE FUNCTION public.set_task_card_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar e setar o título do card automaticamente
  SELECT title INTO NEW.card_title
  FROM public.kanban_cards
  WHERE id = NEW.card_id;
  
  -- Se não encontrar, deixar NULL
  IF NEW.card_title IS NULL THEN
    NEW.card_title := 'Card não encontrado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para preencher card_title ao inserir
DROP TRIGGER IF EXISTS set_task_card_title_trigger ON public.card_tasks;
CREATE TRIGGER set_task_card_title_trigger
  BEFORE INSERT ON public.card_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_card_title();

-- =====================================================
-- 5. HABILITAR RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.card_tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. POLICIES DE SEGURANÇA (RLS)
-- =====================================================

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "tasks_select_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.card_tasks;

-- =====================================================
-- 6.1. POLICY: SELECT (Visualizar tarefas)
-- =====================================================
-- QUALQUER usuário autenticado pode visualizar tarefas
-- Se o usuário pode ver o card, pode ver suas tarefas
CREATE POLICY "tasks_select_policy"
ON public.card_tasks
FOR SELECT
USING (
  -- Qualquer usuário autenticado pode ver tarefas
  auth.uid() IS NOT NULL
);

-- =====================================================
-- 6.2. POLICY: INSERT (Criar tarefas)
-- =====================================================
-- QUALQUER usuário autenticado pode criar tarefas para qualquer pessoa
-- Isso permite flexibilidade total na criação de tarefas
CREATE POLICY "tasks_insert_policy"
ON public.card_tasks
FOR INSERT
WITH CHECK (
  -- Verificar se o usuário está autenticado
  auth.uid() IS NOT NULL
  AND
  -- Verificar se o usuário tem acesso ao card
  EXISTS (
    SELECT 1 FROM public.kanban_cards fc
    WHERE fc.id = card_id
  )
  AND
  -- Não pode criar tarefa para si mesmo
  auth.uid() != assigned_to
);

-- =====================================================
-- 6.3. POLICY: UPDATE (Atualizar tarefas)
-- =====================================================
-- QUALQUER usuário autenticado pode atualizar tarefas
-- Isso permite que qualquer um marque/desmarque tarefas
CREATE POLICY "tasks_update_policy"
ON public.card_tasks
FOR UPDATE
USING (
  -- Qualquer usuário autenticado pode atualizar
  auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Qualquer usuário autenticado pode atualizar
  auth.uid() IS NOT NULL
);

-- =====================================================
-- 6.4. POLICY: DELETE (Deletar tarefas)
-- =====================================================
-- Apenas quem criou a tarefa pode deletá-la
CREATE POLICY "tasks_delete_policy"
ON public.card_tasks
FOR DELETE
USING (
  auth.uid() = created_by
);

-- =====================================================
-- 7. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para obter estatísticas de tarefas de um usuário
CREATE OR REPLACE FUNCTION public.get_user_task_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'overdue', COUNT(*) FILTER (WHERE status = 'pending' AND deadline < now())
  )
  INTO result
  FROM public.card_tasks
  WHERE assigned_to = user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover função antiga se existir (necessário para mudar tipo de retorno)
DROP FUNCTION IF EXISTS public.get_card_tasks(uuid);

-- Função para obter tarefas por card
CREATE OR REPLACE FUNCTION public.get_card_tasks(card_id_param UUID)
RETURNS TABLE (
  id UUID,
  card_id UUID,
  card_title TEXT,
  created_by UUID,
  assigned_to UUID,
  description TEXT,
  status TEXT,
  deadline TIMESTAMPTZ,
  comment_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_name TEXT,
  assigned_to_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.card_id,
    ct.card_title,
    ct.created_by,
    ct.assigned_to,
    ct.description,
    ct.status,
    ct.deadline,
    ct.comment_id,
    ct.created_at,
    ct.updated_at,
    ct.completed_at,
    p1.full_name AS created_by_name,
    p2.full_name AS assigned_to_name
  FROM public.card_tasks ct
  LEFT JOIN public.profiles p1 ON ct.created_by = p1.id
  LEFT JOIN public.profiles p2 ON ct.assigned_to = p2.id
  WHERE ct.card_id = card_id_param
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT DE PERMISSÕES
-- =====================================================

-- Garantir que usuários autenticados possam acessar a tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_tasks TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 9. CRIAR VIEW PARA CONSULTAS ENRIQUECIDAS
-- =====================================================

-- View que junta todas as informações úteis (para consultas no Supabase Dashboard)
CREATE OR REPLACE VIEW public.v_card_tasks_detailed AS
SELECT 
  ct.id,
  ct.card_id,
  ct.card_title,
  ct.description,
  ct.status,
  ct.deadline,
  ct.created_at,
  ct.updated_at,
  ct.completed_at,
  
  -- Informações do criador
  p_created.full_name AS created_by_name,
  p_created.role AS created_by_role,
  
  -- Informações do responsável
  p_assigned.full_name AS assigned_to_name,
  p_assigned.role AS assigned_to_role,
  
  -- Informações do card
  kc.phone AS card_phone,
  kc.email AS card_email,
  kc.stage AS card_stage,
  
  -- Informações do comentário (se existir)
  ct.comment_id,
  
  -- Indicadores úteis
  CASE 
    WHEN ct.status = 'pending' AND ct.deadline < now() THEN true 
    ELSE false 
  END AS is_overdue,
  
  CASE 
    WHEN ct.status = 'completed' THEN 
      EXTRACT(EPOCH FROM (ct.completed_at - ct.created_at))/3600 
  END AS completion_time_hours

FROM public.card_tasks ct
LEFT JOIN public.profiles p_created ON ct.created_by = p_created.id
LEFT JOIN public.profiles p_assigned ON ct.assigned_to = p_assigned.id
LEFT JOIN public.kanban_cards kc ON ct.card_id = kc.id
ORDER BY ct.created_at DESC;

-- Comentário da view
COMMENT ON VIEW public.v_card_tasks_detailed IS 'View detalhada de tarefas com todas as informações relacionadas (nomes, emails, status, etc.). Útil para análise e consultas no Supabase Dashboard.';

-- Garantir acesso à view
GRANT SELECT ON public.v_card_tasks_detailed TO authenticated;

-- =====================================================
-- 10. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se a tabela foi criada corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'card_tasks'
  ) THEN
    RAISE NOTICE '✓ Tabela card_tasks criada com sucesso';
  ELSE
    RAISE EXCEPTION '✗ Erro: Tabela card_tasks não foi criada';
  END IF;
  
  -- Verificar se RLS está habilitado
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'card_tasks' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS habilitado na tabela card_tasks';
  ELSE
    RAISE EXCEPTION '✗ Erro: RLS não está habilitado na tabela card_tasks';
  END IF;
  
  -- Verificar número de policies
  IF (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'card_tasks'
  ) = 4 THEN
    RAISE NOTICE '✓ 4 policies criadas com sucesso';
  ELSE
    RAISE WARNING '⚠ Número de policies diferente de 4';
  END IF;
  
  RAISE NOTICE '===================================';
  RAISE NOTICE '✓ SISTEMA DE TAREFAS CONFIGURADO!';
  RAISE NOTICE '===================================';
END $$;

