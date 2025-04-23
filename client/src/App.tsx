import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages
import AuthPage from '@/pages/auth-page';
import CreatePlan from '@/pages/CreatePlan';
import Schedule from '@/pages/Schedule';

// Layout components
const Header = ({ showNav = true }: { showNav?: boolean }) => (
  showNav ? (
    <header className="bg-primary text-primary-foreground p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">FocusGrid</h1>
        <nav>
          <ul className="flex space-x-4">
            <li><a href="/" className="hover:underline">Home</a></li>
            <li><a href="/plans/new" className="hover:underline">New Plan</a></li>
          </ul>
        </nav>
      </div>
    </header>
  ) : null
);

const Layout = ({ children, showNav = true }: { children: React.ReactNode, showNav?: boolean }) => (
  <div className="min-h-screen flex flex-col">
    <Header showNav={showNav} />
    <main className="flex-grow container mx-auto">
      {children}
    </main>
    <footer className="bg-muted p-4 text-center text-sm text-muted-foreground">
      <div className="container mx-auto">
        FocusGrid &copy; {new Date().getFullYear()}
      </div>
    </footer>
  </div>
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/">
          {/* No layout wrapper for homepage to allow for custom header/footer */}
          <AuthPage />
        </Route>
        <Route path="/plans/new">
          <Layout>
            <CreatePlan />
          </Layout>
        </Route>
        <Route path="/plans/:id">
          {(params) => (
            <Layout>
              <Schedule id={params.id} />
            </Layout>
          )}
        </Route>
        <Route>
          <Layout>
            <div className="p-8 text-center">
              <h1 className="text-2xl font-bold">404 - Not Found</h1>
              <p className="mt-2">The page you're looking for doesn't exist.</p>
              <a href="/" className="mt-4 inline-block text-primary hover:underline">Go to Dashboard</a>
            </div>
          </Layout>
        </Route>
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}
