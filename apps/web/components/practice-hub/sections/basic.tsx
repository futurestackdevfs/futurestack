"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Field, Input, Out, Panel, Select, Textarea, type SectionProps } from "./ui";

/* ───────────── Inputs ───────────── */

export function InputsSection({ bug }: SectionProps) {
  const [f, setF] = useState({ fullName: "", email: "", password: "", age: "", phone: "", dob: "", searchBox: "", bio: "" });
  const [result, setResult] = useState("Nothing submitted yet");
  const on = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 @md:grid-cols-2 @2xl:grid-cols-3">
        <Field label="Full name" htmlFor="fullName"><Input id="fullName" value={f.fullName} onChange={on("fullName")} placeholder="Your name" /></Field>
        <Field label="Email" htmlFor="email"><Input id="email" type="email" value={f.email} onChange={on("email")} placeholder="you@example.com" /></Field>
        <Field label="Password" htmlFor="password"><Input id="password" type="password" value={f.password} onChange={on("password")} /></Field>
        <Field label="Age" htmlFor="age"><Input id="age" type="number" value={f.age} onChange={on("age")} /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" type="tel" value={f.phone} onChange={on("phone")} /></Field>
        <Field label="Date of birth" htmlFor="dob"><Input id="dob" type="date" value={f.dob} onChange={on("dob")} /></Field>
        <Field label="Search" htmlFor="searchBox"><Input id="searchBox" type="search" value={f.searchBox} onChange={on("searchBox")} /></Field>
        <Field label="Read-only" htmlFor="readonlyField"><Input id="readonlyField" readOnly defaultValue="FS-1042" /></Field>
        <Field label="Disabled" htmlFor="disabledField"><Input id="disabledField" disabled defaultValue="Locked" /></Field>
      </div>
      <Field label="Bio" htmlFor="bio"><Textarea id="bio" value={f.bio} onChange={on("bio")} placeholder="Tell us about yourself" /></Field>
      <div className="flex flex-wrap items-center gap-3">
        <Btn
          id="submitInput"
          disabled={bug}
          onClick={() => setResult(`Submitted: ${f.fullName || "—"} · ${f.email || "—"} · age ${f.age || "—"}`)}
        >
          Submit
        </Btn>
        <div className="min-w-0 flex-1"><Out id="inputResult">{result}</Out></div>
      </div>
    </div>
  );
}

/* ───────────── Forms ───────────── */

export function FormsSection({ bug }: SectionProps) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reg, setReg] = useState({ first: "", last: "", country: "", terms: false });
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const countries = bug ? ["USA", "UK", "Canada"] : ["India", "USA", "UK", "Canada"];

  return (
    <div className="grid gap-3 @2xl:grid-cols-2">
      <Panel title="Login">
        <div className="space-y-3">
          <Field label="Email" htmlFor="loginUser"><Input id="loginUser" type="email" value={user} onChange={(e) => setUser(e.target.value)} /></Field>
          <Field label="Password" htmlFor="loginPass"><Input id="loginPass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
          <Btn
            id="loginBtn"
            onClick={() =>
              user === "student@futurestack.in" && pass === "Learn@123"
                ? setMsg({ ok: true, text: "Welcome back, student!" })
                : setMsg({ ok: false, text: "Invalid credentials" })
            }
          >
            Log in
          </Btn>
          {msg && <Out id="loginMsg" tone={msg.ok ? "ok" : "err"}>{msg.text}</Out>}
        </div>
      </Panel>

      <Panel title="Registration">
        <div className="space-y-3">
          <div className="grid gap-2.5 @md:grid-cols-2">
            <Field label="First name" htmlFor="firstName"><Input id="firstName" value={reg.first} onChange={(e) => setReg({ ...reg, first: e.target.value })} /></Field>
            <Field label="Last name" htmlFor="lastName"><Input id="lastName" value={reg.last} onChange={(e) => setReg({ ...reg, last: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[["genderMale", "Male"], ["genderFemale", "Female"], ["genderOther", "Other"]].map(([id, l]) => (
              <label key={id} className="inline-flex items-center gap-1.5">
                <input id={id} data-testid={id} type="radio" name="gender" /> {l}
              </label>
            ))}
          </div>
          <Field label="Country" htmlFor="country">
            <Select id="country" value={reg.country} onChange={(e) => setReg({ ...reg, country: e.target.value })}>
              <option value="">Select country</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <label className="inline-flex items-center gap-2 text-sm">
            <input id="terms" data-testid="terms" type="checkbox" checked={reg.terms} onChange={(e) => setReg({ ...reg, terms: e.target.checked })} />
            I accept the terms
          </label>
          <div><Btn
            id="registerBtn"
            onClick={() => {
              if (!reg.first || !reg.last || !reg.country || !reg.terms) {
                setDone("");
                setErr("Please complete all required fields");
              } else {
                setErr("");
                setDone(`Registration successful for ${reg.first} ${reg.last}`);
              }
            }}
          >
            Register
          </Btn></div>
          {err && <Out id="formError" tone="err">{err}</Out>}
          {done && <Out id="formSuccess" tone="ok">{done}</Out>}
        </div>
      </Panel>
    </div>
  );
}

/* ───────────── OTP ───────────── */

export function OtpSection({ bug }: SectionProps) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [shown, setShown] = useState(false);
  const [sending, setSending] = useState(false);
  const [hint, setHint] = useState("");
  const [err, setErr] = useState("");
  const [welcome, setWelcome] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const fetchOtp = () => {
    setErr("");
    if (!/^\d{10}$/.test(mobile)) {
      setErr("Enter a valid 10-digit mobile number");
      return;
    }
    setSending(true);
    timer.current = window.setTimeout(() => {
      setSending(false);
      setShown(true);
      setHint("Demo OTP: 123456");
    }, bug ? 20000 : 1500);
  };

  return (
    <div className="mx-auto max-w-md space-y-3">
      <Panel title="Sign in with OTP">
        <div className="space-y-3">
          <Field label="Mobile number" htmlFor="mobile"><Input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit number" /></Field>
          <div className="flex gap-2">
            <Btn id="fetchOtp" onClick={fetchOtp} disabled={sending}>{sending ? "Sending…" : "Fetch OTP"}</Btn>
            {shown && <Btn id="resendOtp" variant="ghost" onClick={() => setHint("OTP re-sent. Demo OTP: 123456")}>Resend OTP</Btn>}
          </div>
          {shown && (
            <>
              <Out id="otpHint">{hint}</Out>
              <Field label="Enter OTP" htmlFor="otpInput"><Input id="otpInput" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} /></Field>
              <Btn
                id="verifyOtp"
                onClick={() => {
                  if (otp === "123456") {
                    setErr("");
                    setWelcome("Login successful. Welcome!");
                  } else {
                    setWelcome("");
                    setErr("Invalid OTP");
                  }
                }}
              >
                Verify
              </Btn>
            </>
          )}
          {err && <Out id="otpError" tone="err">{err}</Out>}
          {welcome && <Out id="welcomeMsg" tone="ok">{welcome}</Out>}
        </div>
      </Panel>
    </div>
  );
}

/* ───────────── Selection ───────────── */

const CITIES = ["Pune", "Puducherry", "Mumbai", "Delhi", "Chennai"];

export function SelectionSection({ bug }: SectionProps) {
  const [plan, setPlan] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [news, setNews] = useState(false);
  const [level, setLevel] = useState("");
  const [exp, setExp] = useState("0");
  const [color, setColor] = useState("#f05a1a");
  const [dark, setDark] = useState(false);
  const [city, setCity] = useState("");
  const [picked, setPicked] = useState(false);
  const matches = city && !picked ? CITIES.filter((c) => c.toLowerCase().startsWith(city.toLowerCase())) : [];
  const toggleSkill = (s: string) => setSkills((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <div className="grid gap-3 @2xl:grid-cols-2">
      <Panel title="Radio & checkboxes">
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-4">
            {[["planFree", "Free"], ["planPro", "Pro"], ["planTeam", "Team"]].map(([id, l]) => (
              <label key={id} className="inline-flex items-center gap-1.5">
                <input id={id} data-testid={id} type="radio" name="plan" checked={plan === l} onChange={() => setPlan(l)} /> {l}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {[["skillSelenium", "Selenium"], ["skillPlaywright", "Playwright"], ["skillApi", "API testing"]].map(([id, l]) => (
              <label key={id} className="inline-flex items-center gap-1.5">
                <input id={id} data-testid={id} type="checkbox" checked={skills.includes(l)} onChange={() => toggleSkill(l)} /> {l}
              </label>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5">
            <input id="newsletter" data-testid="newsletter" type="checkbox" disabled={bug} checked={news} onChange={(e) => setNews(e.target.checked)} /> Subscribe to newsletter
          </label>
        </div>
      </Panel>

      <Panel title="Dropdown, slider, colour & toggle">
        <div className="space-y-3">
          <Field label="Level" htmlFor="level">
            <Select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Select level</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </Select>
          </Field>
          <Field label="Experience (years)" htmlFor="experience">
            <div className="flex items-center gap-3">
              <Input id="experience" type="range" min={0} max={20} value={exp} onChange={(e) => setExp(e.target.value)} className="px-0" />
              <span id="experienceValue" data-testid="experienceValue" className="w-8 text-sm font-bold">{exp}</span>
            </div>
          </Field>
          <div className="flex items-center gap-6">
            <Field label="Theme colour" htmlFor="themeColor"><Input id="themeColor" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 p-1" /></Field>
            <div className="flex items-center gap-2 text-sm">
              <button
                id="darkToggle"
                data-testid="darkToggle"
                type="button"
                role="switch"
                aria-checked={dark}
                onClick={() => setDark((d) => !d)}
                className={`relative h-6 w-11 rounded-full transition ${dark ? "bg-[var(--green)]" : "bg-[var(--border2)]"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? "left-[22px]" : "left-0.5"}`} />
              </button>
              Dark mode
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Autocomplete" className="@2xl:col-span-2">
        <div className="relative max-w-sm">
          <Field label="City" htmlFor="cityInput">
            <Input id="cityInput" value={city} onChange={(e) => { setCity(e.target.value); setPicked(false); }} placeholder="Start typing…" autoComplete="off" />
          </Field>
          {matches.length > 0 && (
            <ul id="cityList" data-testid="cityList" className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-[var(--border2)] bg-[var(--surface)] shadow-lg">
              {matches.map((c) => (
                <li key={c}>
                  <button id={`city-${c.toLowerCase()}`} data-testid={`city-${c.toLowerCase()}`} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg2)]" onClick={() => { setCity(c); setPicked(true); }}>
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3"><Out id="selectionSummary">
          Plan: {plan || "—"} · Skills: {skills.join(", ") || "—"} · Newsletter: {news ? "yes" : "no"} · Level: {level || "—"}
        </Out></div>
      </Panel>
    </div>
  );
}
