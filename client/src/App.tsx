import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CreatePlan from "./pages/CreatePlan";
import Schedule from "./pages/Schedule";
import Progress from "./pages/Progress";
import AuthPage from "./pages/auth-page";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import NotFound from "@/pages/not-found";

function MainTabs() {
  const [location, setLocation] = useLocation();

  return (
    <div className="mb-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Link href="/">
            <a 
              className={`whitespace-nowrap py-4 px-1 font-medium text-sm border-b-2 ${
                location === "/" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Create Plan
            </a>
          </Link>
          <Link href="/schedule">
            <a 
              className={`whitespace-nowrap py-4 px-1 font-medium text-sm border-b-2 ${
                location === "/schedule" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Schedule
            </a>
          </Link>
          <Link href="/progress">
            <a 
              className={`whitespace-nowrap py-4 px-1 font-medium text-sm border-b-2 ${
                location === "/progress" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Progress
            </a>
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  // Don't show MainTabs on auth page or google auth success page
  const showTabs = location !== "/auth" && !location.startsWith("/auth/google");
  
  return (
    <>
      {showTabs && <MainTabs />}
      <Switch>
        <ProtectedRoute path="/" component={CreatePlan} />
        <ProtectedRoute path="/schedule" component={Schedule} />
        <ProtectedRoute path="/progress" component={Progress} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/google/success" component={GoogleAuthSuccess} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 w-full mx-auto">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
