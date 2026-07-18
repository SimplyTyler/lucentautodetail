"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";

export function AuthPanel({ initialMode = "login", nextPath = "/portal", preview = false }) {
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const safeNextPath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/portal";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch(`/api/auth/${mode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "We could not complete that request.");
      }
      window.location.assign(safeNextPath);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="authPanel">
      <div className="authTabs" role="tablist" aria-label="Account access">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setMessage(""); }}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setMessage(""); }}>
          Create account
        </button>
      </div>

      <div className="authHeading">
        <span className="kicker">Member access</span>
        <h1>{mode === "login" ? "Welcome back." : "Your garage starts here."}</h1>
        <p>{mode === "login" ? "Manage vehicles, visits, and billing from one clean view." : "Create an account, add your vehicles, then choose the right recurring care plan."}</p>
      </div>

      {preview && (
        <div className="previewNotice">
          <LockKeyhole size={17} aria-hidden="true" />
          Local preview mode is active. Any credentials will open the demo portal.
        </div>
      )}

      <form className="authForm" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            <span>Full name</span>
            <input name="name" type="text" autoComplete="name" required minLength={2} placeholder="Alex Morgan" />
          </label>
        )}
        <label>
          <span>Email address</span>
          <input name="email" type="email" autoComplete="email" required placeholder="alex@example.com" />
        </label>
        <label>
          <span>Password</span>
          <span className="passwordField">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              placeholder="8 characters minimum"
            />
            <button
              className="passwordToggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        {mode === "signup" && (
          <label className="checkField">
            <input name="terms" type="checkbox" required />
            <span>I agree to the membership terms and recurring billing disclosures.</span>
          </label>
        )}
        <button className="button buttonLime authSubmit" type="submit" disabled={busy}>
          {busy ? "One moment..." : mode === "login" ? "Sign in" : "Create account"}
          {!busy && <ArrowRight size={18} aria-hidden="true" />}
        </button>
        {message && <p className="formMessage formMessageError" role="alert">{message}</p>}
      </form>
    </div>
  );
}
