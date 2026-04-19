import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setProgressProfileUser } from "@/game/progressStats";
import loginBg from "@/assets/background_login.png";
import lampSprite from "@/assets/lamp.png";

type Mode = "login" | "signup";

/* Stone slab — Landing page aesthetic: dark blue-grey stone with amber ember glow on all edges */
const boxStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, hsl(228 10% 16%), hsl(228 12% 10%))",
  border: "2px solid hsl(0 0% 3%)",
  borderRadius: "4px",
  boxShadow: [
    /* outer ember glow — matches lp-eng-glow multi-layer bloom */
    "0 0 8px hsl(33 100% 50% / 0.45)",
    "0 0 20px hsl(33 100% 45% / 0.22)",
    "0 0 36px hsl(33 100% 40% / 0.12)",
    /* inset stone bevel */
    "inset 1px 1px 0 hsl(0 0% 100% / 0.08)",
    "inset -1px -1px 0 hsl(0 0% 0% / 0.85)",
    "inset 0 0 22px hsl(0 0% 0% / 0.55)",
    /* drop */
    "0 6px 18px hsl(0 0% 0% / 0.65)",
  ].join(", "),
  backdropFilter: "blur(3px)",
};

/* Input carved into stone */
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "hsl(228 14% 7%)",
  border: "1px solid hsl(0 0% 6%)",
  borderRadius: "3px",
  color: "hsl(42 45% 82%)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "14px",
  padding: "8px 12px",
  outline: "none",
  boxShadow: "inset 0 2px 6px hsl(0 0% 0% / 0.6)",
};

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      setProgressProfileUser(data.session.user);
      navigate("/play", { replace: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      setProgressProfileUser(session.user);
      navigate("/play", { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/play`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        setProgressProfileUser(data.user);
        navigate("/play");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/play` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        setProgressProfileUser(data.session.user);
        navigate("/play");
      }
      else {
        setInfo("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    }

    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "'VT323', 'Courier New', monospace",
      }}
    >
      {/* Dark stone atmosphere overlay — matches Landing page */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 38%, hsl(0 0% 0% / 0.75) 100%)" }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "hsl(230 18% 5% / 0.45)" }}
      />

      {/* Right-side ambient lamp */}
      <div className="pointer-events-none fixed bottom-[8%] right-[-67%] z-[2] hidden md:block auth-lamp-wrap" aria-hidden>
        <div className="auth-lamp-halo" />
        <div className="auth-lamp-glow" />
        <img src={lampSprite} alt="" className="auth-lamp-sprite" />
      </div>

      {/* Left-side panel */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex flex-col gap-4"
        style={{ width: "360px", maxHeight: "90vh", overflowY: "auto", marginLeft: "0%" }}
      >
        {/* Title box */}
        <div style={{ ...boxStyle, padding: "20px 22px 16px" }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              color: "hsl(0 0% 28%)",
              fontWeight: 700,
              marginBottom: "8px",
              /* lp-eng engraved style */
              textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85), 1px 1px 0 hsl(0 0% 100%/0.22)",
            }}
          >
            Terminal Quest
          </p>
          <h1
            style={{
              fontFamily: "'Cinzel', 'Pirata One', serif",
              fontSize: "clamp(22px, 4vw, 30px)",
              fontWeight: 900,
              letterSpacing: "0.06em",
              lineHeight: 1.1,
              margin: 0,
              /* lp-eng-glow style from Landing */
              color: "hsl(38 80% 60%)",
              textShadow: [
                "-1px -1px 0 hsl(0 0% 0%/0.9)",
                "1px 1px 0 hsl(0 0% 100%/0.12)",
                "0 0 8px hsl(30 100% 50%/0.7)",
                "0 0 20px hsl(30 100% 45%/0.45)",
                "0 0 36px hsl(30 100% 40%/0.25)",
              ].join(", "),
            }}
          >
            {mode === "login" ? "Enter the Dungeon" : "Join the Quest"}
          </h1>
          <div
            style={{
              marginTop: "12px",
              height: "1px",
              width: "60px",
              background: "linear-gradient(90deg, hsl(33 100% 45% / 0.6), transparent)",
            }}
          />
        </div>

        {/* Terminal prompt box */}
        <div
          style={{
            ...boxStyle,
            padding: "10px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "hsl(140 55% 52%)", fontWeight: "bold" }}>player</span>
          <span style={{ color: "#f3f4f6" }}>@dungeon</span>
          <span style={{ color: "hsl(0 0% 40%)" }}>:~$ </span>
          <span style={{ color: "hsl(38 100% 55%)", textShadow: "0 0 8px hsl(38 100% 50% / 0.5)" }}>
            {mode === "login"
              ? "ssh authenticate --realm terminal-quest"
              : "adduser --realm terminal-quest"}
          </span>
          <span style={{ color: "hsl(38 100% 55%)", boxShadow: "0 0 8px hsl(38 100% 55%/0.8)" }}>▮</span>
        </div>

        {/* Email */}
        <div>
          <label
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsl(38 80% 58%)",
              display: "block",
              marginBottom: "6px",
              textShadow: "0 0 8px hsl(33 100% 45% / 0.4)",
            }}
          >
            ✦ Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="hero@example.com"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "hsl(33 100% 45% / 0.6)"; e.target.style.boxShadow = "inset 0 2px 6px hsl(0 0% 0% / 0.6), 0 0 8px hsl(33 100% 50% / 0.35)"; }}
            onBlur={e => { e.target.style.borderColor = "hsl(0 0% 6%)"; e.target.style.boxShadow = "inset 0 2px 6px hsl(0 0% 0% / 0.6)"; }}
          />
        </div>

        {/* Password */}
        <div>
          <label
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsl(38 80% 58%)",
              display: "block",
              marginBottom: "6px",
              textShadow: "0 0 8px hsl(33 100% 45% / 0.4)",
            }}
          >
            ✦ Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "hsl(33 100% 45% / 0.6)"; e.target.style.boxShadow = "inset 0 2px 6px hsl(0 0% 0% / 0.6), 0 0 8px hsl(33 100% 50% / 0.35)"; }}
            onBlur={e => { e.target.style.borderColor = "hsl(0 0% 6%)"; e.target.style.boxShadow = "inset 0 2px 6px hsl(0 0% 0% / 0.6)"; }}
          />
        </div>

        {/* Error box */}
        {error && (
          <div
            style={{
              ...boxStyle,
              padding: "10px 14px",
              background: "rgba(40, 5, 5, 0.85)",
              border: "1px solid rgba(160, 40, 40, 0.5)",
              color: "hsl(0 75% 60%)",
              fontFamily: "'VT323', monospace",
              fontSize: "16px",
            }}
          >
            ✗ {error}
          </div>
        )}

        {/* Info box */}
        {info && (
          <div
            style={{
              ...boxStyle,
              padding: "10px 14px",
              background: "rgba(30, 20, 5, 0.85)",
              border: "1px solid rgba(160, 110, 30, 0.5)",
              color: "hsl(38 80% 58%)",
              fontFamily: "'VT323', monospace",
              fontSize: "16px",
            }}
          >
            ℹ {info}
          </div>
        )}

        {/* Submit box */}
        <div style={{ ...boxStyle, padding: "14px 16px" }}>
          <button
            type="submit"
            disabled={loading}
            className="stone-tablet-btn w-full py-2 tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "13px",
              letterSpacing: "0.22em",
            }}
          >
            {loading ? "[ ... ]" : mode === "login" ? "[ ENTER DUNGEON ]" : "[ BEGIN QUEST ]"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 4px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }} />
          <span style={{ color: "hsl(0 0% 28%)", fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.2em", fontWeight: 700, textShadow: "-1px -1px 0 hsl(0 0%0%/0.85), 1px 1px 0 hsl(0 0%100%/0.22)" }}>
            OR
          </span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }} />
        </div>

        {/* Google OAuth box */}
        <div style={{ ...boxStyle, padding: "14px 16px" }}>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "hsl(228 14% 7%)",
              border: "1px solid hsl(0 0% 6%)",
              borderRadius: "3px",
              color: "hsl(42 35% 68%)",
              fontFamily: "'Cinzel', serif",
              fontSize: "12px",
              letterSpacing: "0.15em",
              padding: "8px",
              cursor: googleLoading || loading ? "not-allowed" : "pointer",
              opacity: googleLoading || loading ? 0.65 : 1,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "inset 0 0 24px hsl(30 100%50%/0.25), 0 0 18px hsl(30 100%50%/0.35), 0 0 36px hsl(30 100%45%/0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(38 80% 60%)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(42 35% 68%)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6v5h6.5c3.8-3.5 6.1-8.7 6.1-14.7z" fill="#4285F4"/>
              <path d="M24 44c5.4 0 10-1.8 13.3-4.8l-6.5-5c-1.8 1.2-4.1 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.3H6v5.2C9.3 39.6 16.2 44 24 44z" fill="#34A853"/>
              <path d="M12.8 27.8c-.4-1.2-.6-2.5-.6-3.8s.2-2.6.6-3.8V15H6A19.9 19.9 0 004 24c0 3.2.8 6.2 2 8.9l6.8-5.1z" fill="#FBBC05"/>
              <path d="M24 12.1c2.9 0 5.5 1 7.5 3l5.6-5.6C33.9 6.3 29.4 4 24 4 16.2 4 9.3 8.4 6 15l6.8 5.1C14.4 15.6 18.8 12.1 24 12.1z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Opening Google..." : "Continue with Google"}
          </button>
        </div>

        {/* Toggle mode box */}
        <div style={{ ...boxStyle, padding: "12px 16px", textAlign: "left" }}>
          <span style={{ color: "hsl(0 0% 28%)", fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700, textShadow: "-1px -1px 0 hsl(0 0%0%/0.85), 1px 1px 0 hsl(0 0%100%/0.1)" }}>
            {mode === "login" ? "No account yet? " : "Already a hero? "}
          </span>
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setInfo(null); }}
            style={{
              color: "hsl(38 80% 58%)",
              fontFamily: "'Cinzel', serif",
              fontSize: "11px",
              fontWeight: 700,
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: "pointer",
              textShadow: "0 0 8px hsl(33 100% 45% / 0.4)",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = "hsl(38 90% 70%)"; (e.target as HTMLElement).style.textShadow = "0 0 8px hsl(30 100%50%/0.7), 0 0 20px hsl(30 100%45%/0.45)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = "hsl(38 80% 58%)"; (e.target as HTMLElement).style.textShadow = "0 0 8px hsl(33 100% 45% / 0.4)"; }}
          >
            {mode === "login" ? "Register here" : "Log in"}
          </button>
        </div>
      </form>
    </div>
  );
}
