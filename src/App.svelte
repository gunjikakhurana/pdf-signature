<script>
  import PDFViewer from './lib/PDFViewer.svelte'
  import PDFUploader from './lib/PDFUploader.svelte'
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
      .insert({ filename, status: 'pending', storage_path: filePath })
      .select()
    if (data) documentId = data[0].id
    if (error) console.error('Error saving document:', error)
  }

  function handleUpload(event) {
    pdfFile = event.detail.file
    const reader = new FileReader()
    reader.onload = function(e) { pdfUrl = e.target.result }
    reader.readAsArrayBuffer(pdfFile)
    saveDocument(pdfFile.name, pdfFile)
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
    if (filledSigners.length === 0) return alert('Please enter at least one signer email!')
    sendingEmail = true
    const res = await fetch('http://localhost:3001/send-signing-request', {
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
      <div class="logo-mark">✍️</div>
      <div>
        <span class="logo-text">SignFlow</span>
        <span class="logo-sub">PDF signing made simple</span>
      </div>
    </div>
    {#if user}
      <div class="header-right">
        <div class="avatar">{user.email[0].toUpperCase()}</div>
        <span class="user-email">{user.email}</span>
        <button class="signout-btn" on:click={logout}>Sign Out</button>
      </div>
    {/if}
  </header>

  <div class="container">
    {#if !user}
      <Auth on:loggedin={(e) => user = e.detail.user} />

    {:else if !pdfUrl}
      <div class="hero">
        <div class="hero-content">
          <div class="hero-badge">⚡ Professional E-Signature Platform</div>
          <h1>Sign Documents <span class="accent">Faster</span></h1>
          <p>Upload PDFs, collect signatures, send email requests, track status and manage documents from a single dashboard.</p>
          <div class="hero-features">
            <div class="hero-feature">
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="secure" />
              <span>Bank-level security</span>
            </div>
            <div class="hero-feature">
              <img src="https://cdn-icons-png.flaticon.com/512/1828/1828640.png" alt="fast" />
              <span>Sign in seconds</span>
            </div>
            <div class="hero-feature">
              <img src="https://cdn-icons-png.flaticon.com/512/3867/3867853.png" alt="track" />
              <span>Track every document</span>
            </div>
          </div>
          <div class="hero-actions">
            <label class="btn-primary">
              📄 Upload Document
              <input type="file" accept=".pdf" style="display:none" on:change={handleFileInput} />
            </label>
          </div>
        </div>

        <div class="hero-illustration">
          <div class="doc-card">
            <div class="doc-card-top">
              <img src="https://cdn-icons-png.flaticon.com/512/2991/2991112.png" alt="pdf" class="doc-icon" />
              <div>
                <p class="doc-name">Contract_2024.pdf</p>
                <p class="doc-meta">2 signers • Sent today</p>
              </div>
            </div>
            <div class="doc-signers">
              <div class="signer-avatar purple">A</div>
              <div class="signer-avatar green">B</div>
              <span class="doc-status-badge">✓ Signed</span>
            </div>
          </div>
          <div class="doc-card small">
            <div class="doc-card-top">
              <img src="https://cdn-icons-png.flaticon.com/512/2991/2991112.png" alt="pdf" class="doc-icon" />
              <div>
                <p class="doc-name">NDA_Agreement.pdf</p>
                <p class="doc-meta">1 signer • Pending</p>
              </div>
            </div>
            <div class="doc-signers">
              <div class="signer-avatar amber">C</div>
              <span class="doc-status-badge pending">⏳ Pending</span>
            </div>
          </div>
        </div>
      </div>

      <Dashboard />

    {:else}
      {#if saving}
        <div class="toast">💾 Saving signature...</div>
      {/if}
      {#if saved}
        <div class="toast success">✅ Signature saved!</div>
      {/if}

      <div class="email-box">
        <div class="email-box-header">
          <span class="email-box-icon">📧</span>
          <div>
            <h3>Request signers</h3>
            <p>Send signing requests in order — each person is notified after the previous signs</p>
          </div>
        </div>
        {#if emailSent}
          <div class="sent">✅ Signing request sent! Signer 1 has been notified.</div>
        {:else}
          <div class="signers-list">
            {#each signers as signer, i}
              <div class="signer-row">
                <span class="signer-num">{i + 1}</span>
                <input type="email" placeholder="Signer {i + 1} email (optional)" bind:value={signers[i]} />
              </div>
            {/each}
          </div>
          <button class="send-btn" on:click={sendSigningRequest} disabled={sendingEmail}>
            {sendingEmail ? 'Sending...' : '📨 Send Signing Requests'}
          </button>
        {/if}
      </div>

      <PDFViewer {pdfUrl} {signatureData} />
      <SignaturePad on:sign={handleSignature} />
    {/if}
  </div>
</main>

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  main {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
    background: #f8f9fa;
  }

  header {
    background: white;
    border-bottom: 1px solid #ede9fe;
    padding: 0 40px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left { display: flex; align-items: center; gap: 12px; }

  .logo-mark {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .logo-text { display: block; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2; }
  .logo-sub { display: block; font-size: 11px; color: #94a3b8; }

  .header-right { display: flex; align-items: center; gap: 12px; }

  .avatar {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
  }

  .user-email { font-size: 13px; color: #475569; }

  .signout-btn {
    padding: 7px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #475569;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
  }

  .signout-btn:hover { border-color: #7c3aed; color: #7c3aed; }

  .container { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }

  .hero {
    background: white;
    border-radius: 20px;
    padding: 48px;
    margin-bottom: 24px;
    border: 1px solid #ede9fe;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
  }

  .hero-content { flex: 1; }

  .hero-badge {
    display: inline-block;
    background: #f5f3ff;
    color: #7c3aed;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 20px;
    border: 1px solid #ede9fe;
  }

  .hero-content h1 {
    font-size: 36px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 14px;
    letter-spacing: -0.5px;
  }

  .accent { color: #7c3aed; }

  .hero-content p {
    font-size: 15px;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 24px;
    max-width: 420px;
  }

  .hero-features {
    display: flex;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .hero-feature {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }

  .hero-feature img { width: 18px; height: 18px; opacity: 0.7; }

  .hero-actions { display: flex; gap: 12px; }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #7c3aed;
    color: white;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    border: none;
  }

  .btn-primary:hover { background: #6d28d9; }

  .hero-illustration {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
    width: 240px;
  }

  .doc-card {
    background: white;
    border: 1px solid #ede9fe;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.08);
  }

  .doc-card.small { transform: translateX(20px); }

  .doc-card-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .doc-icon { width: 30px; height: 30px; }

  .doc-name { font-size: 12px; font-weight: 600; color: #0f172a; margin: 0 0 2px; }
  .doc-meta { font-size: 11px; color: #94a3b8; margin: 0; }

  .doc-signers { display: flex; align-items: center; gap: 6px; }

  .signer-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: white;
  }

  .signer-avatar.purple { background: #7c3aed; }
  .signer-avatar.green { background: #16a34a; }
  .signer-avatar.amber { background: #d97706; }

  .doc-status-badge {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    background: #dcfce7;
    color: #16a34a;
    padding: 3px 10px;
    border-radius: 20px;
  }

  .doc-status-badge.pending { background: #fef9c3; color: #b45309; }

  .toast { background: #1e293b; color: white; padding: 12px 20px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
  .toast.success { background: #14532d; }

  .email-box {
    background: white;
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 24px;
    border: 1px solid #ede9fe;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .email-box-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }

  .email-box-icon {
    font-size: 20px;
    width: 44px;
    height: 44px;
    background: #f5f3ff;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .email-box-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
  .email-box-header p { font-size: 13px; color: #94a3b8; margin: 0; }

  .signers-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .signer-row { display: flex; align-items: center; gap: 12px; }

  .signer-num {
    width: 28px;
    height: 28px;
    background: #7c3aed;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .signer-row input {
    flex: 1;
    padding: 10px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
  }

  .signer-row input:focus { border-color: #7c3aed; }

  .send-btn {
    width: 100%;
    padding: 12px;
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    transition: background 0.15s;
  }

  .send-btn:hover { background: #6d28d9; }
  .send-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .sent {
    background: #f0fdf4;
    color: #16a34a;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    border: 1px solid #bbf7d0;
  }
</style>