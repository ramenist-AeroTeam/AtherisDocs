import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function Auth() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) nav("/", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const signInGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-sm p-8 space-y-6 border">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-display font-bold">atheris</h1>
          <p className="text-sm text-muted-foreground">sign in to play</p>
        </div>
        <Button onClick={signInGoogle} disabled={loading} className="w-full" size="lg">
          {loading ? "..." : "Continue with Google"}
        </Button>
      </Card>
    </div>
  );
}
