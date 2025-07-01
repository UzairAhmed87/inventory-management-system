import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "@/store/authStore";
import { useInventoryStore } from '@/store/inventoryStore';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, login } = useAuthStore();
  const globalLoader = useInventoryStore(state => state.globalLoader);

  // Hydration state for Zustand persist
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Zustand persist exposes a non-standard property for hydration
    // @ts-ignore
    if (useAuthStore.persist) {
      // @ts-ignore
      useAuthStore.persist.onHydrate(() => setHydrated(false));
      // @ts-ignore
      useAuthStore.persist.onFinishHydration(() => setHydrated(true));
      // @ts-ignore
      setHydrated(useAuthStore.persist.hasHydrated());
    } else {
      setHydrated(true); // fallback: assume hydrated
    }
  }, []);

  const loaderOverlay = globalLoader ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
      <div className="p-6 bg-white rounded shadow-lg flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
        <span className="text-primary font-semibold">Processing...</span>
      </div>
    </div>
  ) : null;

  // Show hydration spinner if not hydrated
  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white bg-opacity-80">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <span className="text-blue-700 font-semibold text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {loaderOverlay}
          <LoginForm onLogin={login} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {loaderOverlay}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
