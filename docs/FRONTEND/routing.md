# ðŸ—ºï¸ DocumentaÃ§Ã£o: Sistema de Rotas

## ðŸŽ¯ **VisÃ£o Geral**
Este documento detalha o sistema de roteamento do frontend, incluindo rotas pÃºblicas, privadas, layouts e navegaÃ§Ã£o.

---

## ðŸ“ **Estrutura de Arquivos**

```
src/
â”œâ”€â”€ App.tsx                    # ConfiguraÃ§Ã£o principal de rotas
â”œâ”€â”€ layouts/
â”‚   â””â”€â”€ ProtectedLayout.tsx   # Layout para rotas autenticadas
â”œâ”€â”€ routes/
â”‚   â””â”€â”€ RequireAuth.tsx       # Guard de autenticaÃ§Ã£o
â””â”€â”€ pages/
    â”œâ”€â”€ Index.tsx             # Kanban (home)
    â”œâ”€â”€ Auth.tsx              # Login/Registro
    â”œâ”€â”€ Tarefas.tsx           # Minhas Tarefas
    â”œâ”€â”€ Agendamento.tsx       # Sistema de agendamento
    â”œâ”€â”€ Historico.tsx         # HistÃ³rico de anÃ¡lises
    â”œâ”€â”€ Profile.tsx           # Perfil do usuÃ¡rio
    â””â”€â”€ NotFound.tsx          # 404 - PÃ¡gina nÃ£o encontrada
```

---

## ðŸ›£ï¸ **Mapa de Rotas**

### **Rotas PÃºblicas**
| Rota | Componente | DescriÃ§Ã£o |
|------|------------|-----------|
| `/auth` | `Auth.tsx` | PÃ¡gina de login e registro |

### **Rotas Privadas (Autenticadas)**
| Rota | Componente | DescriÃ§Ã£o | Sidebar |
|------|------------|-----------|---------|
| `/` | `Index.tsx` | Kanban principal | âœ… Kanban |
| `/inicio` | `Index.tsx` | Alias para `/` | - |
| `/tarefas` | `Tarefas.tsx` | Minhas Tarefas | âœ… Tarefas |
| `/agendamento` | `Agendamento.tsx` | GestÃ£o de agendamentos | âœ… Agendamento |
| `/historico` | `Historico.tsx` | HistÃ³rico de anÃ¡lises | âœ… HistÃ³rico |
| `/perfil` | `Profile.tsx` | Perfil do usuÃ¡rio | âœ… Perfil |
| `/dashboard/all` | `Index.tsx` | VisualizaÃ§Ã£o geral | - |
| `/dashboard/:company` | `Index.tsx` | Filtro por empresa | - |

### **Rota de Fallback**
| Rota | Componente | DescriÃ§Ã£o |
|------|------------|-----------|
| `*` | `NotFound.tsx` | 404 - PÃ¡gina nÃ£o encontrada |

---

## ðŸ” **ProteÃ§Ã£o de Rotas**

### **RequireAuth Guard**
**LocalizaÃ§Ã£o**: `src/routes/RequireAuth.tsx`

**Funcionalidade**:
- Verifica se usuÃ¡rio estÃ¡ autenticado
- Redireciona para `/auth` se nÃ£o estiver
- Permite acesso a rotas protegidas

**CÃ³digo:**
```typescript
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Redireciona para login, salvando a pÃ¡gina tentada
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />; // Renderiza rotas filhas
}
```

**Uso no App:**
```typescript
<Route element={<RequireAuth />}>
  <Route element={<ProtectedLayout />}>
    <Route path="/" element={<Index />} />
    {/* Outras rotas protegidas */}
  </Route>
</Route>
```

---

## ðŸŽ¨ **Layouts**

### **ProtectedLayout**
**LocalizaÃ§Ã£o**: `src/layouts/ProtectedLayout.tsx`

**Funcionalidade**:
- Adiciona sidebar de navegaÃ§Ã£o
- Header global
- Container para conteÃºdo
- Outlet para rotas filhas

**Estrutura:**
```typescript
export default function ProtectedLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet /> {/* Renderiza pÃ¡gina atual */}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

**Rotas que usam:**
- `/` - Kanban
- `/tarefas` - Tarefas
- `/agendamento` - Agendamento
- `/historico` - HistÃ³rico
- `/perfil` - Perfil

---

## ðŸ§­ **NavegaÃ§Ã£o**

### **AppSidebar**
**LocalizaÃ§Ã£o**: `src/components/app-sidebar.tsx`

**Itens de NavegaÃ§Ã£o:**
```typescript
const navigationItems = [
  { title: "Tarefas", url: "/tarefas", icon: ListTodo },
  { title: "Kanban", url: "/", icon: KanbanSquare, end: true },
  { title: "Agendamento", url: "/agendamento", icon: Route },
  { title: "HistÃ³rico", url: "/historico", icon: History },
  { title: "Perfil", url: "/perfil", icon: User },
];
```

**DetecÃ§Ã£o de Rota Ativa:**
```typescript
const location = useLocation();
const active = item.end 
  ? currentPath === item.url 
  : currentPath.startsWith(item.url);
```

**Componente NavLink:**
```typescript
<NavLink to={item.url} end={item.end}>
  {({ isActive }) => (
    <SidebarMenuButton isActive={isActive}>
      <item.icon />
      <span>{item.title}</span>
    </SidebarMenuButton>
  )}
</NavLink>
```

---

## ðŸš€ **NavegaÃ§Ã£o ProgramÃ¡tica**

### **useNavigate Hook**
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// NavegaÃ§Ã£o simples
navigate('/tarefas');

// NavegaÃ§Ã£o com state
navigate('/dashboard/empresa-x', { 
  state: { from: 'kanban' } 
});

// Voltar
navigate(-1);

// Substituir (sem adicionar ao histÃ³rico)
navigate('/login', { replace: true });
```

### **Link Component**
```typescript
import { Link } from 'react-router-dom';

// Link simples
<Link to="/tarefas">Ver Tarefas</Link>

// Link com className
<Link 
  to="/perfil" 
  className="text-blue-500 hover:underline"
>
  Meu Perfil
</Link>

// Link com state
<Link 
  to="/dashboard/empresa-x" 
  state={{ filter: 'pending' }}
>
  Empresa X
</Link>
```

---

## ðŸ“„ **PÃ¡ginas Principais**

### **1. Index (Kanban)**
**Rota**: `/`  
**Arquivo**: `src/pages/Index.tsx`

**Funcionalidades:**
- Board Kanban completo
- Drag & Drop de cards
- Filtros e busca
- CriaÃ§Ã£o de fichas
- EdiÃ§Ã£o de cards

---

### **2. Tarefas**
**Rota**: `/tarefas`  
**Arquivo**: `src/pages/Tarefas.tsx`

**Funcionalidades:**
- Lista de tarefas do usuÃ¡rio
- Filtros: Hoje, Semana, Todas
- Checkbox de conclusÃ£o
- BotÃ£o "Ir" para card original

---

### **3. Agendamento**
**Rota**: `/agendamento`  
**Arquivo**: `src/pages/Agendamento.tsx`

**Funcionalidades:**
- Grid de agendamentos semanais
- GestÃ£o de tÃ©cnicos
- ConfiguraÃ§Ã£o de rotas
- NavegaÃ§Ã£o de semanas

---

### **4. HistÃ³rico**
**Rota**: `/historico`  
**Arquivo**: `src/pages/Historico.tsx`

**Funcionalidades:**
- HistÃ³rico de anÃ¡lises
- Filtros avanÃ§ados
- Insights e estatÃ­sticas
- Upload de arquivos histÃ³ricos

---

### **5. Profile**
**Rota**: `/perfil`  
**Arquivo**: `src/pages/Profile.tsx`

**Funcionalidades:**
- EdiÃ§Ã£o de perfil
- Troca de senha
- Upload de avatar
- ConfiguraÃ§Ãµes pessoais

---

### **6. Auth**
**Rota**: `/auth`  
**Arquivo**: `src/pages/Auth.tsx`

**Funcionalidades:**
- Login
- Registro
- RecuperaÃ§Ã£o de senha
- Redirecionamento pÃ³s-login

---

## ðŸ”„ **Redirecionamentos**

### **ApÃ³s Login**
```typescript
// Em RequireAuth.tsx
const location = useLocation();
const from = location.state?.from?.pathname || '/';

if (user) {
  navigate(from, { replace: true });
}
```

### **Logout**
```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
  navigate('/auth');
};
```

### **404 Fallback**
```typescript
// Qualquer rota nÃ£o definida
<Route path="*" element={<NotFound />} />
```

---

## ðŸŽ¯ **PadrÃµes de Roteamento**

### **Rotas Aninhadas**
```typescript
<Route element={<RequireAuth />}>
  <Route element={<ProtectedLayout />}>
    <Route path="/" element={<Index />} />
    <Route path="/tarefas" element={<Tarefas />} />
  </Route>
</Route>
```

### **ParÃ¢metros de Rota**
```typescript
// Definir rota com parÃ¢metro
<Route path="/dashboard/:company" element={<Dashboard />} />

// Usar parÃ¢metro
import { useParams } from 'react-router-dom';

const { company } = useParams<{ company: string }>();
```

### **Query Params**
```typescript
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();

// Ler
const filter = searchParams.get('filter'); // ?filter=pending

// Escrever
setSearchParams({ filter: 'completed' });
```

---

## ðŸš¨ **Boas PrÃ¡ticas**

### **âœ… FAZER**

1. **Usar Outlet para layouts**
```typescript
<ProtectedLayout>
  <Outlet /> {/* Renderiza rota filha */}
</ProtectedLayout>
```

2. **Lazy Loading para pÃ¡ginas grandes**
```typescript
const Historico = lazy(() => import('./pages/Historico'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/historico" element={<Historico />} />
  </Routes>
</Suspense>
```

3. **Guards para permissÃµes**
```typescript
<Route element={<RequireRole role="gestor" />}>
  <Route path="/admin" element={<Admin />} />
</Route>
```

4. **Tipagem de rotas**
```typescript
type AppRoute = '/' | '/tarefas' | '/agendamento' | '/historico' | '/perfil';

const navigate = useNavigate();
navigate<AppRoute>('/tarefas');
```

### **âŒ NÃƒO FAZER**

1. **NÃ£o usar `<a>` tags**
```typescript
// âŒ Ruim (recarrega pÃ¡gina)
<a href="/tarefas">Tarefas</a>

// âœ… Bom (SPA navigation)
<Link to="/tarefas">Tarefas</Link>
```

2. **NÃ£o esquecer `replace` em redirecionamentos**
```typescript
// âŒ Ruim (adiciona ao histÃ³rico)
navigate('/login');

// âœ… Bom (substitui no histÃ³rico)
navigate('/login', { replace: true });
```

3. **NÃ£o hardcode URLs**
```typescript
// âŒ Ruim
navigate('/dashboard/empresa-123');

// âœ… Bom
navigate(`/dashboard/${companyId}`);
```

---

## ðŸ” **Debugging de Rotas**

### **React Router DevTools**
```typescript
// Instalar
npm install react-router-devtools

// Usar em desenvolvimento
import { RouterDevTools } from 'react-router-devtools';

<BrowserRouter>
  <App />
  {import.meta.env.DEV && <RouterDevTools />}
</BrowserRouter>
```

### **Logging de NavegaÃ§Ã£o**
```typescript
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('ðŸ“ Current route:', location.pathname);
  }
}, [location.pathname]);
```

---

## ðŸ“¦ **DependÃªncias**

### **React Router**
- `react-router-dom@6.x`: Biblioteca principal
- `BrowserRouter`: Router baseado em history API
- `Routes / Route`: DefiniÃ§Ã£o de rotas
- `Link / NavLink`: NavegaÃ§Ã£o
- `useNavigate / useLocation / useParams`: Hooks

---

## ðŸ”® **Melhorias Futuras**

1. **Breadcrumbs**
```typescript
<Breadcrumb>
  <BreadcrumbItem to="/">Home</BreadcrumbItem>
  <BreadcrumbItem to="/tarefas">Tarefas</BreadcrumbItem>
</Breadcrumb>
```

2. **TransiÃ§Ãµes de PÃ¡gina**
```typescript
<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    {/* rotas */}
  </Routes>
</AnimatePresence>
```

3. **Pre-loading de Rotas**
```typescript
const preloadRoute = (path: string) => {
  const module = routeModules[path];
  module?.();
};

<Link 
  to="/tarefas" 
  onMouseEnter={() => preloadRoute('/tarefas')}
>
  Tarefas
</Link>
```

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Components Guide, Hooks Guide, Auth System
