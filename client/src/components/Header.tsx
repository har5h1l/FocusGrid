import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Book, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";

export default function Header() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation, isLoading } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  const isAuthPage = location === "/auth";
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/auth");
  };

  const handleSavePlan = () => {
    // Actual logic to save the plan would go here
    const event = new CustomEvent('save-plan');
    document.dispatchEvent(event);
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center">
              <Book className="h-8 w-8 text-primary" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">StudySync</h1>
            </a>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {!isAuthPage && !user && !isLoading && (
            <Button variant="outline" onClick={() => setIsLoginOpen(true)}>
              Sign In
            </Button>
          )}
          
          {user && !isLoading && (
            <>
              {location.startsWith("/schedule") || location.startsWith("/progress") ? (
                <Button 
                  variant="default" 
                  onClick={() => navigate("/")}
                >
                  Create New Plan
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  onClick={handleSavePlan}
                >
                  Save Plan
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="font-medium">
                    Signed in as {user.username}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Sign in to your account or create a new one to save your study plans
            </DialogDescription>
          </DialogHeader>
          <LoginForm onSuccess={() => setIsLoginOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
}
