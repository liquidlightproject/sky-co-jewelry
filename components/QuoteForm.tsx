"use client";

import { FormEvent, RefObject, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      reset: (container?: Element | string) => void;
    };
    __setTurnstileToken?: (token: string) => void;
  }
}

export function QuoteForm({ location }: { location: "Georgetown" | "Taylor" }) {
  const [submitting, setSubmitting] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const honeypot = String(formData.get("company") || "").trim();
    if (honeypot) {
      setSubmitting(false);
      return;
    }

    const token = String(formData.get("turnstileToken") || "").trim();
    if (!token) {
      alert("Please complete the Turnstile challenge and try again.");
      setSubmitting(false);
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      location,
      company: honeypot,
      turnstileToken: token,
    };

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.ok) {
      form.reset();
      if (tokenRef.current) tokenRef.current.value = "";

      if (window.turnstile) {
        const widget = document.querySelector(".cf-turnstile");
        if (widget) window.turnstile.reset(widget);
      }

      alert("Submitted. We’ll reach out shortly.");
      return;
    }

    alert("Something went wrong. Please try again.");
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" placeholder="Email" type="email" required />
      <input name="phone" placeholder="Phone" required />
      <textarea name="message" placeholder="What do you need help with?" required />

      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <label>
          Company
          <input name="company" autoComplete="off" tabIndex={-1} />
        </label>
      </div>

      <input ref={tokenRef} type="hidden" name="turnstileToken" />

      <div
        className="cf-turnstile"
        data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />

      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Request Quote"}
      </button>

      <TurnstileCallbackBinder tokenRef={tokenRef} />
    </form>
  );
}

function TurnstileCallbackBinder({ tokenRef }: { tokenRef: RefObject<HTMLInputElement | null> }) {
  useEffect(() => {
    window.__setTurnstileToken = (token: string) => {
      if (tokenRef.current) tokenRef.current.value = token;
    };

    const widget = document.querySelector(".cf-turnstile");
    if (widget && !widget.getAttribute("data-callback")) {
      widget.setAttribute("data-callback", "__setTurnstileToken");
    }

    return () => {
      delete window.__setTurnstileToken;
    };
  }, [tokenRef]);

  return null;
}
