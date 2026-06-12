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

  onMount(async () => {
    await loadDocuments()
  })

  async function loadDocuments() {
    const { data } = await supabase
      .from('documents')
      .select('*, signatures(*)')
      .order('uploaded_at', { ascending: false })
    if (data) documents = data
    loading = false
  }

  async function deleteDocument(id) {
    if (!confirm('Are you sure you want to delete this document?')) return
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
      <h2>Documents</h2>
      <p class="sub">Manage and track all your signed documents</p>
    </div>
    <span class="total-badge">{filtered.length} total</span>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-left">
        <p class="stat-label">Total Documents</p>
        <p class="stat-value">{totalDocs}</p>
      </div>
      <div class="stat-icon default">📁</div>
    </div>
    <div class="stat-card">
      <div class="stat-left">
        <p class="stat-label">Signed</p>
        <p class="stat-value green">{signedDocs}</p>
      </div>
      <div class="stat-icon green-bg">✅</div>
    </div>
    <div class="stat-card">
      <div class="stat-left">
        <p class="stat-label">Pending</p>
        <p class="stat-value amber">{pendingDocs}</p>
      </div>
      <div class="stat-icon amber-bg">⏳</div>
    </div>
    <div class="stat-card">
      <div class="stat-left">
        <p class="stat-label">Total Signatures</p>
        <p class="stat-value purple">{totalSignatures}</p>
      </div>
      <div class="stat-icon purple-bg">✍️</div>
    </div>
  </div>

  <div class="controls">
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search by filename..."
        bind:value={search}
      />
    </div>
    <div class="filter-tabs">
      <button class:active={statusFilter === 'all'} on:click={() => statusFilter = 'all'}>All</button>
      <button class:active={statusFilter === 'signed'} on:click={() => statusFilter = 'signed'}>✓ Signed</button>
      <button class:active={statusFilter === 'pending'} on:click={() => statusFilter = 'pending'}>⏳ Pending</button>
    </div>
  </div>

  {#if loading}
    <div class="empty-state">
      <div class="spinner"></div>
      <p>Loading documents...</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      <p class="empty-icon">📭</p>
      <p class="empty-title">No documents found</p>
      <p class="empty-sub">Upload a PDF below to get started</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Signatures</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as doc}
            <tr>
              <td class="filename">
                <span class="file-icon">📄</span>
                {doc.filename}
              </td>
              <td>
                <span class="badge {doc.status}">
                  {doc.status === 'signed' ? '✓ Signed' : '⏳ Pending'}
                </span>
              </td>
              <td class="date">{formatDate(doc.uploaded_at)}</td>
              <td>
                <span class="sig-count">{doc.signatures.length}</span>
              </td>
              <td>
                <button class="delete-btn" on:click={() => deleteDocument(doc.id)} title="Delete">
                  🗑
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
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04);
    border: 1px solid #f1f5f9;
  }

  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
  }

  .dash-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px;
    text-align: left;
  }

  .sub { font-size: 13px; color: #94a3b8; margin: 0; }

  .total-badge {
    background: #f1f5f9;
    color: #475569;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid #e2e8f0;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: box-shadow 0.2s;
  }

  .stat-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
    margin: 0 0 6px;
    font-weight: 500;
  }

  .stat-value {
    font-size: 30px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    line-height: 1;
  }

  .stat-value.green { color: #16a34a; }
  .stat-value.amber { color: #d97706; }
  .stat-value.purple { color: #7c3aed; }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: #f1f5f9;
    flex-shrink: 0;
  }

  .stat-icon.green-bg { background: #dcfce7; }
  .stat-icon.amber-bg { background: #fef9c3; }
  .stat-icon.purple-bg { background: #ede9fe; }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .search-wrap {
    flex: 1;
    position: relative;
    min-width: 200px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
  }

  .search-wrap input {
    width: 100%;
    padding: 9px 12px 9px 36px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #0f172a;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .search-wrap input::placeholder { color: #94a3b8; }
  .search-wrap input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
    background: white;
  }

  .filter-tabs {
    display: flex;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 3px;
    gap: 3px;
  }

  .filter-tabs button {
    padding: 7px 16px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
  }

  .filter-tabs button:hover { color: #0f172a; }

  .filter-tabs button.active {
    background: white;
    color: #7c3aed;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    color: #94a3b8;
  }

  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-title { font-size: 16px; font-weight: 600; color: #64748b; margin: 0 0 6px; }
  .empty-sub { font-size: 13px; color: #94a3b8; margin: 0; }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e2e8f0;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .table-wrap { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 14px; }

  thead tr { border-bottom: 2px solid #f1f5f9; }

  th {
    text-align: left;
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  tbody tr {
    border-bottom: 1px solid #f8fafc;
    transition: background 0.1s;
  }

  tbody tr:hover { background: #f8fafc; }
  tbody tr:last-child { border-bottom: none; }

  td {
    padding: 14px 16px;
    color: #334155;
    vertical-align: middle;
  }

  .filename {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    color: #0f172a;
  }

  .file-icon { font-size: 16px; }
  .date { color: #94a3b8; font-size: 13px; }

  .sig-count {
    background: #ede9fe;
    color: #7c3aed;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    display: inline-block;
  }

  .badge {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    display: inline-block;
  }

  .badge.signed { background: #dcfce7; color: #16a34a; }
  .badge.pending { background: #fef9c3; color: #b45309; }

  .delete-btn {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #ef4444;
    padding: 7px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
  }

  .delete-btn:hover { background: #fee2e2; }
</style>