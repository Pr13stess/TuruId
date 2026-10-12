import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createAdminClient, VerificationRepository } from "./src/repository";
import { canReview, decisionReason, statusLabel, type Decision, type Queue, type Status, type Submission, type Target } from "./src/verification";
import "./src/styles.css";

const date = (value: string | null) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";
const message = (error: unknown) => error instanceof Error ? error.message : "Terjadi kendala. Coba lagi.";
function Brand() { return <div className="brand"><span className="brand-icon" aria-hidden="true">T</span><span>Turu<span className="orange">Id</span><small>ADMINISTRASI</small></span></div>; }
function Badge({ status }: { status: string }) { return <span className={`badge ${status.toLowerCase()}`}>{statusLabel[status] ?? status}</span>; }

export default function App() {
  const [setup] = useState(() => {
    try {
      const client = createAdminClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      return { client, repo: new VerificationRepository(client), error: "" };
    } catch (error) { return { client: null, repo: null, error: message(error) }; }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [access, setAccess] = useState<{ id: string; error: string } | null>(null);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    if (!setup.client) return;
    let active = true;
    const sub = setup.client.auth.onAuthStateChange((_event, value) => {
      if (active) { setSession(value); setRestoring(false); }
    });
    void setup.client.auth.getSession().then(({ data, error }) => {
      if (active) { setSession(data.session); setRestoring(false); if (error) setAuthError("Sesi tidak dapat dipulihkan. Silakan masuk kembali."); }
    });
    return () => { active = false; sub.data.subscription.unsubscribe(); };
  }, [setup]);
  const actor = session?.user.id;
  useEffect(() => {
    if (!actor || !setup.repo) return;
    let active = true;
    void setup.repo.requireAdmin().then(() => { if (active) setAccess({ id: actor, error: "" }); })
      .catch(error => { if (active) setAccess({ id: actor, error: message(error) }); });
    return () => { active = false; };
  }, [actor, setup]);
  const signOut = async () => {
    const { error } = await setup.client!.auth.signOut({ scope: "local" });
    if (error) { setAuthError("Belum berhasil keluar. Coba lagi."); return; }
    setSession(null); setAccess(null);
  };
  if (setup.error) return <div className="login-page"><div className="login-card"><Brand /><h1>Siapkan Admin TuruId</h1><p role="alert">{setup.error}</p><p>Gunakan konfigurasi publik DEV dari pengelola. Jangan masukkan kunci rahasia ke aplikasi web.</p></div></div>;
  if (restoring) return <div className="center-state" role="status">Memulihkan sesi…</div>;
  if (!session) return <Login error={authError} onSubmit={async (email, password) => {
    setAuthError("");
    const { error } = await setup.client!.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error("Email atau kata sandi tidak cocok, atau koneksi bermasalah.");
  }} />;
  if (!access || access.id !== actor || access.error) return <div className="login-page"><div className="login-card">
    <Brand /><h1>{access && access.id === actor ? "Akses dibatasi" : "Memeriksa akses…"}</h1>
    <p role="status">{access && access.id === actor ? access.error : "Hanya akun dengan peran admin aktif yang dapat masuk."}</p>
    {authError && <p className="error" role="alert">{authError}</p>}
    <button onClick={() => void signOut()}>Keluar</button>
  </div></div>;
  return <Workspace repo={setup.repo!} email={session.user.email ?? "Admin"} onSignOut={signOut} authError={authError} />;
}

function Login({ onSubmit, error }: { onSubmit: (email: string, password: string) => Promise<void>; error: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return <div className="login-page"><form className="login-card" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setNotice("");
    try { await onSubmit(email, password); } catch (e) { setNotice(message(e)); } finally { setBusy(false); setPassword(""); }
  }}>
    <Brand /><span className="eyebrow">RUANG KERJA ADMIN · DEV</span><h1>Selamat datang kembali.</h1>
    <p>Periksa pengajuan owner dan kos dengan keputusan yang jelas.</p>
    <label>Email admin<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
    <label>Kata sandi<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
    {(notice || error) && <p className="error" role="alert">{notice || error}</p>}
    <button type="submit" disabled={busy}>{busy ? "Memeriksa akun…" : "Masuk ke admin"}</button>
    <small>Akses diberikan oleh pengelola. Tidak tersedia pendaftaran admin mandiri.</small>
  </form></div>;
}

function Workspace({ repo, email, onSignOut, authError }: { repo: VerificationRepository; email: string; onSignOut: () => Promise<void>; authError: string }) {
  const [target, setTarget] = useState<Target>("OWNER");
  const [status, setStatus] = useState<Status>("PENDING");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; queue?: Queue; error?: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const key = `${target}:${status}:${page}:${revision}`;
  useEffect(() => {
    let active = true;
    void repo.list(target, status, page).then(queue => { if (active) setResult({ key, queue }); })
      .catch(error => { if (active) setResult({ key, error: message(error) }); });
    return () => { active = false; };
  }, [repo, target, status, page, key]);
  const current = result?.key === key ? result : null;
  const selected = current?.queue?.items.find(s => s.id === selection);
  const changeTarget = (next: Target) => { setTarget(next); setPage(0); setSelection(null); setNotice(""); };
  return <div className="workspace">
    <aside className="sidebar"><Brand /><span className="nav-label">VERIFIKASI</span>
      <nav aria-label="Menu verifikasi">
        <button className={target === "OWNER" ? "nav active" : "nav"} disabled={working} onClick={() => changeTarget("OWNER")} aria-current={target === "OWNER" ? "page" : undefined}><span aria-hidden="true">◎</span> Verifikasi owner</button>
        <button className={target === "PROPERTY" ? "nav active" : "nav"} disabled={working} onClick={() => changeTarget("PROPERTY")} aria-current={target === "PROPERTY" ? "page" : undefined}><span aria-hidden="true">⌂</span> Verifikasi kos</button>
      </nav><div className="sidebar-note">Keputusan yang teliti.<br />Informasi kos yang tepercaya.</div>
      <div className="account"><small>MASUK SEBAGAI</small><span>{email}</span><button className="nav" disabled={working} onClick={() => void onSignOut()}>Keluar</button></div>
    </aside>
    <main><header className="topbar"><span>Administrasi / Verifikasi</span><span className="dev-pill">LINGKUNGAN DEV</span></header>
      <section className="page-heading"><span className="eyebrow">TINJAU DAN PUTUSKAN</span><h1>Verifikasi {target === "OWNER" ? "owner" : "kos"}</h1>
        <p>{target === "OWNER" ? "Periksa identitas dan bukti pengajuan pemilik kos." : "Periksa informasi dan bukti kos secara terpisah dari verifikasi owner."}</p>
      </section>
      <div className="toolbar"><div className="filters" aria-label="Status pengajuan">
        {(["PENDING", "APPROVED", "REJECTED"] as Status[]).map(s => <button key={s} className={status === s ? "filter selected" : "filter"} aria-pressed={status === s} disabled={working}
          onClick={() => { setStatus(s); setPage(0); setSelection(null); }}>{statusLabel[s]}</button>)}
      </div><button className="secondary" disabled={working} onClick={() => setRevision(n => n + 1)}>Muat ulang</button></div>
      {(notice || authError) && <div className={authError ? "banner error" : "banner"} role="status">{authError || notice}</div>}
      <div className="review-layout"><section className="panel queue" aria-label="Daftar pengajuan">
        <div className="panel-heading"><h2>Daftar pengajuan</h2><span>{current?.queue ? `${current.queue.total} pengajuan` : "—"}</span></div>
        {!current ? <div className="empty" role="status">Memuat pengajuan…</div> : current.error ? <div className="empty error" role="alert">{current.error}</div> : <>
          {!current.queue?.items.length && <div className="empty">Belum ada pengajuan dengan status ini.</div>}
          {current.queue?.items.map(s => <button key={s.id} disabled={working} className={`queue-item ${selected?.id === s.id ? "chosen" : ""}`} aria-pressed={selected?.id === s.id} onClick={() => setSelection(s.id)}>
            <div className="queue-title"><strong>{s.name}</strong><Badge status={s.status} /></div>
            <span>{target === "OWNER" ? "Pengajuan pemilik kos" : `${s.owner_name} · ${s.city || "Kota belum diisi"}`}</span>
            <small>{date(s.submitted_at)}{!s.is_latest ? " · Pengajuan lama" : ""}</small>
          </button>)}
          <div className="pagination"><button className="secondary" disabled={working || page === 0} onClick={() => { setPage(p => p - 1); setSelection(null); }}>Sebelumnya</button>
            <small>Halaman {page + 1}</small><button className="secondary" disabled={working || (page + 1) * 20 >= (current.queue?.total ?? 0)} onClick={() => { setPage(p => p + 1); setSelection(null); }}>Berikutnya</button></div>
        </>}
      </section>
      <section className="panel detail" aria-label="Detail pengajuan">
        {selected ? <Review key={`${selected.id}:${selected.target_updated_at}`} submission={selected} repo={repo} onBusy={setWorking} onDone={() => {
          setNotice("Keputusan tersimpan. Status owner dan kos tetap diperiksa secara terpisah.");
          setSelection(null); setPage(0); setRevision(n => n + 1);
        }} /> : <div className="empty detail-empty"><span className="empty-icon" aria-hidden="true">▤</span><h2>Pilih pengajuan untuk ditinjau</h2><p>Informasi pemohon dan bukti akan tampil di sini.</p></div>}
      </section></div>
      <p className="footnote">Persetujuan owner tidak otomatis menyetujui kos. Status publikasi kos tetap mengikuti pengaturan yang berlaku.</p>
    </main>
  </div>;
}

function Review({ submission: s, repo, onBusy, onDone }: { submission: Submission; repo: VerificationRepository; onBusy: (busy: boolean) => void; onDone: () => void }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [seen, setSeen] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const confirm = async () => {
    if (!decision || lock.current || !seen) return;
    lock.current = true; setError(""); setBusy(true); onBusy(true);
    try { decisionReason(decision, reason); await repo.decide(s, decision, reason); onDone(); }
    catch (e) { setError(message(e)); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  };
  const markSeen = useCallback(() => setSeen(true), []);
  return <>
    <div className="panel-heading"><span className="eyebrow">DETAIL PENGAJUAN</span><Badge status={s.status} /></div>
    <div className="detail-body"><h2>{s.name}</h2><dl>
      <dt>Pemilik</dt><dd>{s.owner_name}</dd><dt>Diajukan</dt><dd>{date(s.submitted_at)}</dd>
      {s.target_type === "PROPERTY" && <><dt>Alamat kos</dt><dd>{s.address || "Belum diisi"}</dd><dt>Verifikasi owner</dt><dd><Badge status={s.owner_status} /></dd><dt>Status publikasi</dt><dd><Badge status={s.publication_status || "DRAFT"} /></dd></>}
      <dt>Status {s.target_type === "OWNER" ? "owner" : "kos"} saat ini</dt><dd><Badge status={s.current_status} /></dd>
    </dl>{s.description && <p className="description">{s.description}</p>}
    <Evidence path={s.evidence_path} repo={repo} onSeen={markSeen} />
    {s.reviewed_at && <div className="review-history"><strong>Keputusan sebelumnya</strong><p>{date(s.reviewed_at)}</p><p>{s.review_reason || "Tanpa catatan tambahan."}</p></div>}
    {!canReview(s) ? <p className="hint">Pengajuan ini sudah diproses atau bukan pengajuan terbaru yang menunggu. Tidak tersedia tindakan keputusan.</p> : <>
      {!seen && <p className="hint">Buka dan periksa bukti terlebih dahulu sebelum mengambil keputusan.</p>}
      {!decision ? <div className="decision-actions"><button disabled={!seen} onClick={() => setDecision("APPROVED")}>Setujui pengajuan</button><button className="danger" disabled={!seen} onClick={() => setDecision("REJECTED")}>Tolak pengajuan</button></div> :
        <form className="decision-box" onSubmit={event => { event.preventDefault(); void confirm(); }}>
          <h3>{decision === "APPROVED" ? "Konfirmasi persetujuan" : "Alasan penolakan"}</h3>
          <p>Keputusan ini hanya berlaku untuk {s.target_type === "OWNER" ? "owner" : "kos"} yang sedang ditinjau.</p>
          <label>{decision === "REJECTED" ? "Alasan penolakan (wajib)" : "Catatan (opsional)"}<textarea disabled={busy} maxLength={2000} required={decision === "REJECTED"} value={reason} onChange={e => setReason(e.target.value)} rows={4} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="decision-actions"><button type="submit" disabled={busy || (decision === "REJECTED" && reason.trim().length < 5)}>{busy ? "Menyimpan…" : "Simpan keputusan"}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setDecision(null); setError(""); }}>Batal</button></div>
        </form>}
    </>}
    </div>
  </>;
}

function Evidence({ path, repo, onSeen }: { path: string; repo: VerificationRepository; onSeen: () => void }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      try { const signed = await repo.evidence(path); if (active) { setUrl(signed); setError(""); } }
      catch (e) { if (active) { setUrl(""); setError(message(e)); } }
    };
    void load(); const timer = setInterval(() => void load(), 240_000);
    return () => { active = false; clearInterval(timer); };
  }, [path, repo, open, revision]);
  return <div className="evidence"><div className="evidence-heading"><h3>Bukti verifikasi</h3><span className="private-label">Privat</span></div>
    {!open ? <button className="secondary" onClick={() => setOpen(true)}>Buka bukti pengajuan</button> : <>
      {url && <img src={url} alt="Bukti yang diajukan untuk verifikasi" referrerPolicy="no-referrer" onLoad={onSeen} onError={() => { setUrl(""); setError("Gambar belum tersedia. Coba muat ulang bukti."); }} />}
      {error ? <p className="error" role="alert">{error}</p> : !url && <p role="status">Memuat bukti…</p>}
      <button className="secondary" onClick={() => setRevision(n => n + 1)}>Muat ulang bukti</button>
    </>}
  </div>;
}
