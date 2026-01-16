import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  email?: string;
  password?: string;
}

const LoginForm = ({
  email: initialEmail,
  password: initialPassword,
}: LoginFormProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState(initialPassword || "");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Update form values when props change (for quick login buttons)
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialPassword) setPassword(initialPassword);
  }, [initialEmail, initialPassword]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
      // Redirect to horses page on successful login
      navigate("/horses");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="userEmail" className="leading-5">
          Email address*
        </Label>
        <Input
          type="email"
          id="userEmail"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {/* Password */}
      <div className="w-full space-y-1">
        <Label htmlFor="password" className="leading-5">
          Password*
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={isVisible ? "text" : "password"}
            placeholder="••••••••••••••••"
            className="pr-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible((prevState) => !prevState)}
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
            disabled={isLoading}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">
              {isVisible ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
      </div>

      {/* Remember Me and Forgot Password */}
      <div className="flex items-center justify-between gap-y-2">
        <div className="flex items-center gap-3">
          <Checkbox id="rememberMe" className="size-6" disabled={isLoading} />
          <Label htmlFor="rememberMe" className="text-muted-foreground">
            Remember Me
          </Label>
        </div>

        <a href="#" className="hover:underline">
          Forgot Password?
        </a>
      </div>

      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in to StableBook"
        )}
      </Button>
    </form>
  );
};

export default LoginForm;
