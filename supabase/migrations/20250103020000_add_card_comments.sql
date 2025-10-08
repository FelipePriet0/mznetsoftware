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

-- Create function to get comment thread (comment + all replies)
CREATE OR REPLACE FUNCTION public.get_comment_thread(p_comment_id uuid)
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
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent_id uuid;
BEGIN
    -- Get the parent_id of the comment
    SELECT parent_id INTO v_parent_id FROM card_comments WHERE id = p_comment_id;
    
    -- If this comment has a parent, return the entire thread
    IF v_parent_id IS NOT NULL THEN
        RETURN QUERY
        WITH RECURSIVE comment_tree AS (
            -- Base case: start with the parent comment
            SELECT 
                c.id, c.card_id, c.parent_id, c.author_id, c.author_name, 
                c.author_role, c.content, c.level, c.created_at, c.updated_at
            FROM card_comments c
            WHERE c.id = v_parent_id
            
            UNION ALL
            
            -- Recursive case: get all replies
            SELECT 
                c.id, c.card_id, c.parent_id, c.author_id, c.author_name, 
                c.author_role, c.content, c.level, c.created_at, c.updated_at
            FROM card_comments c
            INNER JOIN comment_tree ct ON c.parent_id = ct.id
        )
        SELECT * FROM comment_tree
        ORDER BY created_at ASC;
    ELSE
        -- If this is a root comment, return it and all its replies
        RETURN QUERY
        WITH RECURSIVE comment_tree AS (
            -- Base case: start with the comment
            SELECT 
                c.id, c.card_id, c.parent_id, c.author_id, c.author_name, 
                c.author_role, c.content, c.level, c.created_at, c.updated_at
            FROM card_comments c
            WHERE c.id = p_comment_id
            
            UNION ALL
            
            -- Recursive case: get all replies
            SELECT 
                c.id, c.card_id, c.parent_id, c.author_id, c.author_name, 
                c.author_role, c.content, c.level, c.created_at, c.updated_at
            FROM card_comments c
            INNER JOIN comment_tree ct ON c.parent_id = ct.id
        )
        SELECT * FROM comment_tree
        ORDER BY created_at ASC;
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_comment_thread(uuid) TO authenticated;
