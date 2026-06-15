<script>
  import { onMount } from 'svelte'
  import { supabase } from './supabase.js'

  let documents = []
  let loading = true
  let search = ''
  let statusFilter = 'all'

  $: totalDocs = documents.length
  $: signedDocs = documents.filter(d => d.status === 'signed').length
  $: pendingDocs = documents.filter(d => d.status === 'pending').length
  $: totalSignatures = documents.reduce((acc, d) => acc + d.signatures.length, 0)

  $: filtered = documents.filter(d => {
    const matchesSearch = d.filename.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  onMount(async () => { await loadDocuments() })

  async function loadDocuments() {
    const { data } = await supabase
      .from('documents')
      .select('*, signatures(*)')
      .order('uploaded_at', { ascending: false })
    if (data) documents = data
    loading = false
  }

  async function deleteDocument(id) {
    if (!confirm('Delete this document?')) return
    await supabase.from('signatures').delete().eq('document_id', id)
    await supabase.from('documents').delete().eq('id', id)
    documents = documents.filter(d => d.id !== id)
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }
</script>

<div class="dashboard">
  <div class="dash-header">
    <div>
      <h2>All documents</h2>
      <p class="sub">Your signing history and document status</p>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <p class="stat-value">{totalDocs}</p>
      <p class="stat-label">Total</p>
    </div>
    <div class="stat-card">
      <p class="stat-value green">{signedDocs}</p>
      <p class="stat-label">Signed</p>
    </div>
    <div class="stat-card">
      <p class="stat-value amber">{pendingDocs}</p>
      <p class="stat-label">Pending</p>
    </div>
    <div class="stat-card">
      <p class="stat-value purple">{totalSignatures}</p>
      <p class="stat-label">Signatures</p>
    </div>
  </div>

  <div class="controls">
    <div class="search-wrap">
      <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" placeholder="Search documents…" bind:value={search} />
    </div>
    <div class="filter-tabs">
      <button class:active={statusFilter === 'all'} on:click={() => statusFilter = 'all'}>All</button>
      <button class:active={statusFilter === 'signed'} on:click={() => statusFilter = 'signed'}>Signed</button>
      <button class:active={statusFilter === 'pending'} on:click={() => statusFilter = 'pending'}>Pending</button>
    </div>
  </div>

  {#if loading}
    <div class="empty-state">
      <div class="spinner"></div>
      <p>Loading…</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <p class="empty-title">No documents yet</p>
      <p class="empty-sub">Upload a PDF above to get started</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Signatures</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as doc}
            <tr>
              <td>
                <div class="doc-cell">
                  <div class="doc-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <span class="filename">{doc.filename}</span>
                </div>
              </td>
              <td>
                <span class="badge {doc.status}">
                  {doc.status === 'signed' ? 'Signed' : 'Pending'}
                </span>
              </td>
              <td class="date">{formatDate(doc.uploaded_at)}</td>
              <td>
                <span class="sig-count">{doc.signatures.length}</span>
              </td>
              <td>
                <button class="delete-btn" on:click={() => deleteDocument(doc.id)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    background: white;
    border: 1px solid #e8e5e0;
    border-radius: 14px;
    overflow: hidden;
  }

  .dash-header {
    padding: 24px 24px 0;
    margin-bottom: 20px;
  }

  .dash-header h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .sub { font-size: 13px; color: #94a3b8; }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border-top: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 20px;
  }

  .stat-card {
    padding: 20px 24px;
    border-right: 1px solid #f1f5f9;
    text-align: center;
  }

  .stat-card:last-child { border-right: none; }

  .stat-value {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 4px;
    line-height: 1;
    letter-spacing: -0.5px;
  }

  .stat-value.green { color: #16a34a; }
  .stat-value.amber { color: #d97706; }
  .stat-value.purple { color: #7c3aed; }

  .stat-label { font-size: 11px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px 16px;
    flex-wrap: wrap;
  }

  .search-wrap { flex: 1; position: relative; min-width: 180px; }

  .search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-wrap input {
    width: 100%;
    padding: 8px 12px 8px 32px;
    background: #f5f4f2;
    border: 1px solid #e8e5e0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    color: #0f172a;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .search-wrap input::placeholder { color: #94a3b8; }
  .search-wrap input:focus { border-color: #1a1a2e; background: white; }

  .filter-tabs {
    display: flex;
    background: #f5f4f2;
    border: 1px solid #e8e5e0;
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }

  .filter-tabs button {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-tabs button:hover { color: #0f172a; }

  .filter-tabs button.active {
    background: white;
    color: #0f172a;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .empty-state { text-align: center; padding: 56px 20px; color: #94a3b8; }

  .empty-icon {
    width: 44px; height: 44px;
    background: #f5f4f2;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
    color: #94a3b8;
  }

  .empty-title { font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 5px; }
  .empty-sub { font-size: 13px; color: #94a3b8; margin: 0; }

  .spinner {
    width: 24px; height: 24px;
    border: 2px solid #e2e8f0;
    border-top-color: #1a1a2e;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 0 auto 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .table-wrap { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }

  thead tr { border-top: 1px solid #f1f5f9; }

  th {
    text-align: left;
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: #fafaf9;
  }

  tbody tr { border-top: 1px solid #f8fafc; transition: background 0.1s; }
  tbody tr:hover { background: #fafaf9; }

  td { padding: 13px 16px; color: #334155; vertical-align: middle; }

  .doc-cell { display: flex; align-items: center; gap: 10px; }

  .doc-icon {
    width: 28px; height: 28px;
    background: #f5f4f2;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: #64748b;
    flex-shrink: 0;
  }

  .filename { font-weight: 500; color: #0f172a; font-size: 13px; }
  .date { color: #94a3b8; font-size: 12px; }

  .sig-count {
    background: #f5f4f2;
    color: #475569;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    display: inline-block;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    display: inline-block;
    letter-spacing: 0.02em;
  }

  .badge.signed { background: #dcfce7; color: #16a34a; }
  .badge.pending { background: #fef9c3; color: #a16207; }

  .delete-btn {
    width: 30px; height: 30px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    color: #94a3b8;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }

  .delete-btn:hover { background: #fef2f2; border-color: #fecaca; color: #ef4444; }
</style>