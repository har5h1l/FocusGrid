import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Brain, Calendar, CheckCircle, Clock, LucideBarChart, PencilRuler, Sparkles, Target, Users } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Comment out the auto-redirect for now
  /*
  useEffect(() => {
    navigate('/plans/new');
  }, [navigate]);
  */

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    
    // For now, mock the login - will be replaced with actual API call
    // Simulating successful login
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Success!",
        description: "You've been logged in",
      });
      navigate('/plans/new');
    }, 1000);
  }

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    
    // For now, mock the registration - will be replaced with actual API call
    // Simulating successful registration
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Account created!",
        description: "Your account has been created",
      });
      navigate('/plans/new');
    }, 1000);
  }

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-gray-900">FocusGrid</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('features')}
              className={`text-sm font-medium ${activeSection === 'features' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('testimonials')}
              className={`text-sm font-medium ${activeSection === 'testimonials' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Testimonials
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className={`text-sm font-medium ${activeSection === 'pricing' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Pricing
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => scrollToSection('auth-section')}>
              Login
            </Button>
            <Button size="sm" onClick={() => navigate('/plans/new')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="absolute inset-0 bg-grid-gray-100/50 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-grid-gray-800/50"></div>
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent leading-tight">
                Master Your Studies with AI-Powered Planning
              </h1>
              <p className="text-xl text-gray-700 mb-8 max-w-2xl">
                FocusGrid helps you create personalized study plans, track your progress, and adapt to your unique learning style - all powered by AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate('/plans/new')} className="gap-2">
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollToSection('features')}>
                  See How It Works
                </Button>
              </div>
              <div className="mt-8 flex items-center">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs">JD</div>
                  <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white text-xs">KL</div>
                  <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs">MN</div>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">+</div>
                </div>
                <p className="text-sm text-gray-600 ml-3">
                  Joined by <span className="font-medium">1,000+</span> students this month
                </p>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-lg p-4 md:p-8 relative">
                <div className="absolute -top-3 -right-3 bg-primary text-white text-xs py-1 px-3 rounded-full">
                  AI-Powered
                </div>
                <h3 className="text-lg font-semibold mb-4">Your Upcoming Study Schedule</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 p-3 border border-gray-100 rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="w-10 h-10 bg-blue-100 text-primary rounded-md flex items-center justify-center">
                        {i === 1 ? <BookIcon /> : i === 2 ? <BarChartIcon /> : <DocumentIcon />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{i === 1 ? 'Study: Psychology Basics' : i === 2 ? 'Review: Memory Chapter' : 'Practice Test: Unit 1'}</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {i === 1 ? '30 min' : i === 2 ? '45 min' : '60 min'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {i === 1 ? 'Read textbook Ch. 1-2' : i === 2 ? 'Focus on memory models' : 'Complete practice questions 1-25'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4">
                  Create Your Study Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Students, by Students</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              FocusGrid is designed to help you study smarter, not harder, with personalized AI recommendations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Clock className="h-8 w-8 text-primary" />}
              title="Smart Scheduling"
              description="AI-optimized study plans based on your learning style and available time."
            />
            <FeatureCard 
              icon={<LucideBarChart className="h-8 w-8 text-primary" />}
              title="Progress Tracking"
              description="Visualize your learning journey with detailed progress analytics."
            />
            <FeatureCard 
              icon={<Target className="h-8 w-8 text-primary" />}
              title="Adaptive Learning"
              description="Study plans that adjust based on your performance and feedback."
            />
            <FeatureCard 
              icon={<Calendar className="h-8 w-8 text-primary" />}
              title="Calendar Integration"
              description="Sync your study sessions with Google Calendar to stay organized."
            />
            <FeatureCard 
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="AI Study Assistant"
              description="Get instant help with difficult topics and personalized study tips."
            />
            <FeatureCard 
              icon={<PencilRuler className="h-8 w-8 text-primary" />}
              title="Custom Resources"
              description="Integrate your textbooks, notes, and other study materials."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Students love how FocusGrid transforms their study habits and improves their results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard 
              quote="FocusGrid helped me organize my chaotic study schedule. I went from a B- to an A in just one semester!"
              author="Alex Johnson"
              role="Computer Science Student"
            />
            <TestimonialCard 
              quote="The AI recommendations are incredibly helpful. It's like having a personal tutor guiding my study sessions."
              author="Samantha Lee"
              role="Pre-Med Student"
            />
            <TestimonialCard 
              quote="I struggled with time management until I found FocusGrid. Now I can balance multiple courses efficiently."
              author="Michael Rodriguez"
              role="Business Major"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              FocusGrid is completely free to use during our public beta phase.
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <Card className="relative overflow-hidden border-primary">
              <div className="absolute top-0 right-0 left-0 h-2 bg-primary"></div>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl">Free Plan</CardTitle>
                    <CardDescription>Perfect for all students</CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <PricingFeature text="Unlimited study plans" />
                  <PricingFeature text="AI study recommendations" />
                  <PricingFeature text="Progress tracking" />
                  <PricingFeature text="Calendar integration" />
                  <PricingFeature text="Study task management" />
                  <PricingFeature text="Basic AI assistant" />
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" onClick={() => navigate('/plans/new')}>
                  Get Started for Free
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Join FocusGrid Today</h2>
              <p className="text-xl text-gray-600 mb-8">
                Create an account to save your study plans and track your progress across devices.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                  <span>Create personalized study plans in less than 2 minutes</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                  <span>Access your study schedule from any device</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                  <span>Get AI-powered study recommendations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                  <span>Track your progress and improve your grades</span>
                </div>
              </div>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to FocusGrid</CardTitle>
                  <CardDescription>
                    Sign in to your account or create a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

                    <TabsContent value="login">
              <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={loginForm.control}
                            name="username"
                    render={({ field }) => (
                      <FormItem>
                                <FormLabel>Username</FormLabel>
                        <FormControl>
                                  <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

                    <TabsContent value="register">
              <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                                  <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating account..." : "Register"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <div className="text-center text-sm text-muted-foreground">
                    <p>For MVP, you can continue without logging in</p>
                    <Button variant="link" onClick={() => navigate('/plans/new')}>
                      Skip Login & Start Now
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">FocusGrid</span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered study planning for students.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <TwitterIcon />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <LinkedinIcon />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <InstagramIcon />
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Beta Program</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
              </div>
              <div>
              <h3 className="text-lg font-medium mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tutorials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
              </div>
              <div>
              <h3 className="text-lg font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} FocusGrid. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl bg-white border border-gray-200 hover:border-primary hover:shadow-md transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string, author: string, role: string }) {
  return (
    <div className="p-6 rounded-xl bg-white border border-gray-200 hover:shadow-md transition-all">
      <div className="mb-4 text-primary">
        <QuoteIcon />
      </div>
      <p className="italic mb-6 text-gray-700">{quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          {author.charAt(0)}
        </div>
        <div>
          <p className="font-medium">{author}</p>
          <p className="text-sm text-gray-600">{role}</p>
        </div>
      </div>
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center">
      <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}

// Icon Components
function BookIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>;
}

function BarChartIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>;
}

function DocumentIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
}

function QuoteIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>;
}

function TwitterIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-1-4.8 4-8.9 9-5 .4-.8 1.2-1.5 2-2z"/></svg>;
}

function LinkedinIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>;
}

function InstagramIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
}