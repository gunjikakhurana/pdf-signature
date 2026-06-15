<script>
  import PDFViewer from './lib/PDFViewer.svelte'
  import SignaturePad from './lib/SignaturePad.svelte'
  import Dashboard from './lib/Dashboard.svelte'
  import Auth from './lib/Auth.svelte'
  import { supabase } from './lib/supabase.js'
  import { onMount } from 'svelte'

  let user = null
  let pdfUrl = null
  let pdfFile = null
  let signatureData = null
  let documentId = null
  let saving = false
  let saved = false
  let emailSent = false
  let sendingEmail = false
  let signers = ['', '', '']
  let dragOver = false

  onMount(async () => {
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null
    })
  })

  async function logout() {
    await supabase.auth.signOut()
    user = null
    pdfUrl = null
  }

  async function saveDocument(filename, file) {
    const filePath = `${Date.now()}_${filename}`
    await supabase.storage.from('pdfs').upload(filePath, file, { contentType: 'application/pdf' })
    const { data, error } = await supabase
      .from('documents')
      .insert({ filename, status: 'pending', storage_path: filePath, user_id: user.id })
      .select()
    if (data) documentId = data[0].id
    if (error) console.error('Error saving document:', error)
  }

  function handleFileInput(e) {
    const file = e.target.files[0]
    if (!file) return
    pdfFile = file
    const reader = new FileReader()
    reader.onload = function(ev) { pdfUrl = ev.target.result }
    reader.readAsArrayBuffer(file)
    saveDocument(file.name, file)
  }

  function handleDrop(e) {
    e.preventDefault()
    dragOver = false
    const file = e.dataTransfer.files[0]
    if (!file || file.type !== 'application/pdf') return alert('Please drop a PDF file.')
    pdfFile = file
    const reader = new FileReader()
    reader.onload = function(ev) { pdfUrl = ev.target.result }
    reader.readAsArrayBuffer(file)
    saveDocument(file.name, file)
  }

  async function handleSignature(event) {
    signatureData = event.detail.signature
    saving = true
    const { error } = await supabase
      .from('signatures')
      .insert({ document_id: documentId, signature_image: signatureData, page_number: 1 })
    if (!error) {
      await supabase.from('documents').update({ status: 'signed' }).eq('id', documentId)
      saving = false
      saved = true
    } else {
      console.error(error)
      saving = false
    }
  }

  async function sendSigningRequest() {
    const filledSigners = signers.filter(s => s.trim() !== '')
    if (filledSigners.length === 0) return alert('Please enter at least one signer email.')
    sendingEmail = true
    const res = await fetch('https://pdf-signature-production.up.railway.app/send-signing-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signers: filledSigners, filename: pdfFile.name, documentId })
    })
    const result = await res.json()
    sendingEmail = false
    if (result.success) emailSent = true
    else { alert('Failed to send.'); console.error(result.error) }
  }
</script>

<main>
  <header>
    <div class="header-left">
      <div class="logo-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          <path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
        </svg>
      </div>
      <span class="logo-text">SignFlow</span>
    </div>
    {#if user}
      <nav class="header-nav">
        <div class="user-chip">
          <div class="avatar">{user.email[0].toUpperCase()}</div>
          <span class="user-email">{user.email}</span>
        </div>
        <button class="signout-btn" on:click={logout}>Sign out</button>
      </nav>
    {/if}
  </header>

  <div class="page">
    {#if !user}
      <div class="auth-wrap">
        <div class="auth-brand">
          <div class="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            </svg>
          </div>
          <h1>SignFlow</h1>
          <p>Collect signatures on any document, in minutes.</p>
        </div>
        <Auth on:loggedin={(e) => user = e.detail.user} />
      </div>

    {:else if !pdfUrl}
      <div class="home">
        <div class="home-hero">
          <div class="hero-eyebrow">E-Signature Platform</div>
          <h2>Upload a document<br/>to get started</h2>
          <p>Upload a PDF, place your signature, and send signing requests — all from one place.</p>
        </div>

        <label
          class="drop-zone"
          class:drag-active={dragOver}
          on:dragover|preventDefault={() => dragOver = true}
          on:dragleave={() => dragOver = false}
          on:drop={handleDrop}
        >
          <div class="drop-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <p class="drop-label">Drop your PDF here</p>
          <p class="drop-sub">or <span class="drop-link">browse files</span></p>
          <input type="file" accept=".pdf" on:change={handleFileInput} hidden />
        </label>

        <div class="features">
          <div class="feature">
            <div class="feature-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p class="feature-title">Secure storage</p>
              <p class="feature-desc">Documents encrypted at rest</p>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p class="feature-title">Sequential signing</p>
              <p class="feature-desc">Each signer notified in order</p>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.01z"/></svg>
            </div>
            <div>
              <p class="feature-title">Email notifications</p>
              <p class="feature-desc">Automatic reminders sent</p>
            </div>
          </div>
        </div>

        <Dashboard />
      </div>

    {:else}
      <div class="workspace">
        {#if saving}
          <div class="toast">Saving signature…</div>
        {/if}
        {#if saved}
          <div class="toast success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Signature saved
          </div>
        {/if}

        <div class="workspace-layout">
          <div class="workspace-main">
            <PDFViewer {pdfUrl} {signatureData} />
            <SignaturePad on:sign={handleSignature} />
          </div>

          <aside class="sidebar">
            <div class="sidebar-doc">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="sidebar-filename">{pdfFile?.name}</span>
            </div>

            <div class="signers-card">
              <h3>Request signatures</h3>
              <p class="signers-desc">Signers are notified in order — each person signs before the next is emailed.</p>

              {#if emailSent}
                <div class="sent-state">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <div>
                    <p class="sent-title">Requests sent</p>
                    <p class="sent-sub">Signer 1 has been notified.</p>
                  </div>
                </div>
              {:else}
                <div class="signers-list">
                  {#each signers as signer, i}
                    <div class="signer-row">
                      <span class="signer-num">{i + 1}</span>
                      <input
                        type="email"
                        placeholder="Email address"
                        bind:value={signers[i]}
                      />
                    </div>
                  {/each}
                </div>
                <button class="send-btn" on:click={sendSigningRequest} disabled={sendingEmail}>
                  {#if sendingEmail}
                    <span class="btn-spinner"></span> Sending…
                  {:else}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Send signing requests
                  {/if}
                </button>
              {/if}
            </div>
          </aside>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  main {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    min-height: 100vh;
    background: #f5f4f2;
    color: #0f172a;
  }

  /* HEADER */
  header {
    background: #fff;
    border-bottom: 1px solid #e8e5e0;
    height: 56px;
    padding: 0 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left { display: flex; align-items: center; gap: 10px; }

  .logo-mark {
    width: 32px; height: 32px;
    background: #1a1a2e;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
  }

  .header-nav { display: flex; align-items: center; gap: 12px; }

  .user-chip {
    display: flex; align-items: center; gap: 8px;
    background: #f5f4f2;
    border: 1px solid #e8e5e0;
    border-radius: 20px;
    padding: 4px 12px 4px 4px;
  }

  .avatar {
    width: 26px; height: 26px;
    background: #1a1a2e;
    color: white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
  }

  .user-email { font-size: 12px; color: #64748b; font-weight: 500; }

  .signout-btn {
    padding: 6px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .signout-btn:hover { border-color: #94a3b8; color: #0f172a; }

  /* PAGE */
  .page { padding: 40px 32px; max-width: 1100px; margin: 0 auto; }

  /* AUTH */
  .auth-wrap { max-width: 400px; margin: 40px auto; }

  .auth-brand {
    text-align: center;
    margin-bottom: 32px;
  }

  .auth-logo {
    width: 52px; height: 52px;
    background: #1a1a2e;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }

  .auth-brand h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .auth-brand p { font-size: 14px; color: #64748b; }

  /* HOME */
  .home { display: flex; flex-direction: column; gap: 32px; }

  .home-hero { max-width: 520px; }

  .hero-eyebrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 14px;
    border: 1px solid #e2e8f0;
    padding: 4px 12px;
    border-radius: 20px;
    background: white;
  }

  .home-hero h2 {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.5px;
    margin-bottom: 12px;
    color: #0f172a;
  }

  .home-hero p { font-size: 15px; color: #64748b; line-height: 1.6; }

  /* DROP ZONE */
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: white;
    border: 2px dashed #d1cdc7;
    border-radius: 16px;
    padding: 56px 40px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .drop-zone:hover, .drop-zone.drag-active {
    border-color: #1a1a2e;
    background: #fafaf9;
  }

  .drop-icon {
    width: 56px; height: 56px;
    background: #f5f4f2;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: #94a3b8;
    margin-bottom: 4px;
    transition: all 0.2s;
  }

  .drop-zone:hover .drop-icon, .drop-zone.drag-active .drop-icon {
    background: #1a1a2e;
    color: white;
  }

  .drop-label { font-size: 15px; font-weight: 600; color: #0f172a; }
  .drop-sub { font-size: 13px; color: #94a3b8; }
  .drop-link { color: #1a1a2e; text-decoration: underline; cursor: pointer; }

  /* FEATURES */
  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .feature {
    background: white;
    border: 1px solid #e8e5e0;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .feature-icon {
    width: 36px; height: 36px;
    background: #f5f4f2;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: #475569;
    flex-shrink: 0;
  }

  .feature-title { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 3px; }
  .feature-desc { font-size: 12px; color: #94a3b8; }

  /* WORKSPACE */
  .workspace { display: flex; flex-direction: column; gap: 16px; }

  .workspace-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    align-items: start;
  }

  .workspace-main { display: flex; flex-direction: column; gap: 16px; }

  /* SIDEBAR */
  .sidebar { display: flex; flex-direction: column; gap: 16px; }

  .sidebar-doc {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #e8e5e0;
    border-radius: 10px;
    padding: 12px 16px;
    color: #64748b;
  }

  .sidebar-filename {
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .signers-card {
    background: white;
    border: 1px solid #e8e5e0;
    border-radius: 14px;
    padding: 24px;
  }

  .signers-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
  .signers-desc { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; }

  .signers-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

  .signer-row { display: flex; align-items: center; gap: 10px; }

  .signer-num {
    width: 24px; height: 24px;
    background: #f5f4f2;
    border: 1px solid #e2e8f0;
    color: #475569;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
    flex-shrink: 0;
  }

  .signer-row input {
    flex: 1;
    padding: 9px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    color: #0f172a;
  }

  .signer-row input:focus {
    border-color: #1a1a2e;
    box-shadow: 0 0 0 3px rgba(26, 26, 46, 0.06);
  }

  .signer-row input::placeholder { color: #cbd5e1; }

  .send-btn {
    width: 100%;
    padding: 11px;
    background: #1a1a2e;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s, opacity 0.15s;
  }

  .send-btn:hover { background: #2d2d4e; }
  .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-spinner {
    width: 12px; height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .sent-state {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    padding: 16px;
  }

  .sent-title { font-size: 13px; font-weight: 600; color: #16a34a; margin-bottom: 2px; }
  .sent-sub { font-size: 12px; color: #64748b; }

  /* TOAST */
  .toast {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #1a1a2e;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    align-self: flex-start;
  }

  .toast.success { background: #15803d; }

  @media (max-width: 768px) {
    .page { padding: 24px 16px; }
    .workspace-layout { grid-template-columns: 1fr; }
    .features { grid-template-columns: 1fr; }
    .home-hero h2 { font-size: 24px; }
  }
</style>