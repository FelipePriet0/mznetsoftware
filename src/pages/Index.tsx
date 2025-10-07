import { useEffect } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = () => {
  useEffect(() => {
    document.title = "Kanban MZNET – Análise de Cadastro";
  }, []);

  return (
    <div className="min-h-screen">
      <header className="pt-2 pb-2" />
      <main className="container pb-16 pt-2">
        <ErrorBoundary>
          <KanbanBoard />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default Index;
