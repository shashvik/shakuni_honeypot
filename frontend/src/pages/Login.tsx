import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, EyeOff, Fingerprint, Key } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(error);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };

  return (
    <div className="flex min-h-screen bg-black/95 overflow-hidden">
      {/* Security-themed visual side */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#1a1f2c] to-[#121212] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Modern cybersecurity background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#22c55e]/5 via-[#1a1f2c] to-[#121212]"></div>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15)_0%,_transparent_50%)] animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,_rgba(34,197,94,0.05)_25%,_transparent_25%,_transparent_75%,_rgba(34,197,94,0.05)_75%)] bg-[length:30px_30px] animate-[grid_20s_linear_infinite]"></div>
        </div>

        <div className="z-10 flex flex-col items-center text-center">
          <Shield className="h-24 w-24 text-white mb-8" />
          <h1 className="text-4xl font-bold text-white mb-6 relative">
            Shakuni
            <span className="absolute -top-4 -right-4 text-xs text-green-400 animate-bounce">Honeypot Active</span>
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-md relative">
            Advanced protection for your digital assets with enterprise-grade security protocols and intelligent honeypot traps
            <span className="block mt-2 text-green-400/80 text-sm animate-pulse">Currently monitoring potential threats...</span>
          </p>

          <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            <div className="flex items-center space-x-3 text-white/90">
              <Lock className="h-5 w-5 text-cyber-accent" />
              <span>Multi Cloud Support</span>
            </div>
            <div className="flex items-center space-x-3 text-white/90">
              <Fingerprint className="h-5 w-5 text-cyber-accent" />
              <span>Cloud Native</span>
            </div>
            <div className="flex items-center space-x-3 text-white/90">
              <Key className="h-5 w-5 text-cyber-accent" />
              <span>Honeynetworks</span>
            </div>
            <div className="flex items-center space-x-3 text-white/90">
              <EyeOff className="h-5 w-5 text-cyber-accent" />
              <span>Alerting</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-sm">
          © 2023 Shakuni. All rights reserved.
        </div>

        {/* Animated security elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-20 h-20 border-2 border-green-500/30 rounded-full animate-pulse-slow">
            <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping"></div>
          </div>
          <div className="absolute bottom-20 right-10 w-32 h-32 border-2 border-emerald-500/20 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}>
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
          </div>
          <div className="absolute top-1/3 right-1/4 w-16 h-16 border-2 border-green-500/30 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}>
            <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" style={{ animationDelay: '2.5s' }}></div>
          </div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 opacity-75 animate-float">
            <svg className="animate-spin-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#22c55e" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="#22c55e" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" fill="#22c55e"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Login form side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-12">
        <Card className="w-full max-w-md border-0 md:border border-gray-800 shadow-none md:shadow-xl bg-black/60 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,128,0.3)] relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative">
            <CardHeader className="space-y-2 text-center">
              <div className="flex justify-center md:hidden">
                <Shield className="h-12 w-12 text-cyber-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Secure access to your account dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serverError && (
                <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="your.email@example.com" className="pl-10" {...field} />
                            <div className="absolute left-3 top-2.5 text-muted-foreground">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                            <div className="absolute left-3 top-2.5 text-muted-foreground">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-gradient-to-r from-[#2c3e50] to-[#1a1f2c] hover:from-[#34495e] hover:to-[#2c3e50] text-white shadow-lg" disabled={isLoading}>
                    {isLoading ? "Verifying credentials..." : "Secure Sign in"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center text-gray-500">
                <span className="inline-flex items-center">
                  <Lock className="h-3 w-3 mr-1" /> Secured by enterprise-grade encryption
                </span>
              </div>
              <div className="w-full border-t pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-primary font-medium hover:underline">
                    Create account
                  </Link>
                </p>
              </div>
            </CardFooter>
          </div>
        </Card>
      </div>
    </div>
  );
}