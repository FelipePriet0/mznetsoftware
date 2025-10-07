# 🔧 Correção: Aplicar Migração SQL para Sistema de Comentários

## 🚨 Problema Identificado
O erro na aba "editar" está ocorrendo porque a tabela `card_comments` não existe no banco de dados Supabase. O sistema de comentários foi implementado no frontend, mas a migração SQL não foi aplicada no backend.

## ✅ Solução Aplicada (Frontend)
- ✅ Adicionado tratamento de erro no hook `useComments`
- ✅ Interface agora funciona mesmo sem a tabela (modo fallback)
- ✅ Mensagem informativa para o usuário
- ✅ Campo de observações continua funcionando normalmente

## 🗄️ Próximo Passo: Aplicar Migração no Supabase

### 1. Acessar Supabase Dashboard
1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Navegue para **SQL Editor**

### 2. Executar Migração
Copie e execute o conteúdo do arquivo:
```
supabase/migrations/20250103020000_add_card_comments.sql
```

**Ou execute este SQL diretamente:**

```sql
-- Create card_comments table for nested comment system
CREATE TABLE IF NOT EXISTS public.card_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES public.card_comments(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id),
    author_name text NOT NULL,
    author_role text,
    content text NOT NULL,
    level integer NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 2),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON public.card_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_parent_id ON public.card_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_author_id ON public.card_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_created_at ON public.card_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_card_comments_level ON public.card_comments(level);

-- Enable RLS
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_comments
CREATE POLICY "card_comments_select_all" ON public.card_comments
    FOR SELECT USING (true);

CREATE POLICY "card_comments_insert_authenticated" ON public.card_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "card_comments_update_author" ON public.card_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "card_comments_delete_author" ON public.card_comments
    FOR DELETE USING (auth.uid() = author_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_card_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_card_comments_updated_at
    BEFORE UPDATE ON public.card_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_card_comments_updated_at();

-- Create function to get comment hierarchy
CREATE OR REPLACE FUNCTION public.get_card_comments_with_hierarchy(p_card_id uuid)
RETURNS TABLE (
    id uuid,
    card_id uuid,
    parent_id uuid,
    author_id uuid,
    author_name text,
    author_role text,
    content text,
    level integer,
    created_at timestamptz,
    updated_at timestamptz,
    reply_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.card_id,
        c.parent_id,
        c.author_id,
        c.author_name,
        c.author_role,
        c.content,
        c.level,
        c.created_at,
        c.updated_at,
        COALESCE(replies.count, 0) as reply_count
    FROM card_comments c
    LEFT JOIN (
        SELECT parent_id, COUNT(*) as count
        FROM card_comments
        WHERE parent_id IS NOT NULL
        GROUP BY parent_id
    ) replies ON c.id = replies.parent_id
    WHERE c.card_id = p_card_id
    ORDER BY c.created_at ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_card_comments_with_hierarchy(uuid) TO authenticated;
```

### 3. Verificar Migração
Após executar o SQL, verifique se a tabela foi criada:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'card_comments';
```

### 4. Testar Sistema
1. Recarregue a aplicação
2. Abra um card no modal "Editar"
3. Os botões "Ver Conversas" e "Nova Conversa" devem aparecer
4. Teste criar uma nova conversa
5. Teste responder a comentários

## 🎯 Resultado Esperado
Após aplicar a migração:
- ✅ Botões de conversa aparecem normalmente
- ✅ Sistema de comentários hierárquicos funciona
- ✅ Anexos funcionam dentro de comentários
- ✅ Interface visual com cores (azul/vermelho/verde)

## 🆘 Se Ainda Houver Problemas
1. Verifique se a tabela `kanban_cards` existe
2. Verifique se a tabela `profiles` existe
3. Confirme se RLS está configurado corretamente
4. Verifique logs do console do navegador

## 📝 Nota
O sistema agora está preparado para funcionar mesmo sem a migração (modo fallback), mas para usar todas as funcionalidades de comentários, a migração SQL deve ser aplicada.
