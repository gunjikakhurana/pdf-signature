<script>
  import { onMount } from 'svelte'
  import * as pdfjsLib from 'pdfjs-dist'
  import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

  export let pdfUrl
  export let signatureData

  let canvas
  let currentPage = 1
  let totalPages = 1
  let pdfDoc = null
  let sigX = 50
  let sigY = 50
  let dragging = false
  let offsetX = 0
  let offsetY = 0

  // Text fields
  let textFields = []
  let selectedTool = null // 'name', 'date', 'text'
  let draggingField = null
  let fieldOffsetX = 0
  let fieldOffsetY = 0

  onMount(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    pdfjsLib.getDocument({ data: pdfUrl }).promise.then(function(doc) {
      pdfDoc = doc
      totalPages = doc.numPages
      renderPage(1)
    })
  })

  function renderPage(num) {
    pdfDoc.getPage(num).then(function(page) {
      const viewport = page.getViewport({ scale: 1.5 })
      canvas.height = viewport.height
      canvas.width = viewport.width
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      page.render({ canvasContext: ctx, viewport })
    })
  }

  function prevPage() {
    if (currentPage <= 1) return
    currentPage = currentPage - 1
    renderPage(currentPage)
  }

  function nextPage() {
    if (currentPage >= totalPages) return
    currentPage = currentPage + 1
    renderPage(currentPage)
  }

  function handleCanvasClick(e) {
    if (!selectedTool) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const defaults = {
      name: { label: 'Full Name', value: 'Full Name', width: 150 },
      date: { label: 'Date', value: new Date().toLocaleDateString('en-IN'), width: 120 },
      text: { label: 'Text', value: 'Custom Text', width: 140 },
    }

    textFields = [...textFields, {
      id: Date.now(),
      type: selectedTool,
      ...defaults[selectedTool],
      x,
      y,
      page: currentPage,
      editing: false,
    }]
    selectedTool = null
  }

  function startDragField(e, id) {
    e.stopPropagation()
    draggingField = id
    const field = textFields.find(f => f.id === id)
    const rect = e.currentTarget.closest('.canvas-wrapper').getBoundingClientRect()
    fieldOffsetX = e.clientX - rect.left - field.x
    fieldOffsetY = e.clientY - rect.top - field.y
  }

  function onMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    if (dragging && signatureData) {
      sigX = e.clientX - rect.left - offsetX
      sigY = e.clientY - rect.top - offsetY
    }
    if (draggingField) {
      const x = e.clientX - rect.left - fieldOffsetX
      const y = e.clientY - rect.top - fieldOffsetY
      textFields = textFields.map(f => f.id === draggingField ? { ...f, x, y } : f)
    }
  }

  function onMouseUp() {
    dragging = false
    draggingField = null
  }

  function onMouseDown(e) {
    if (!signatureData) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (mx >= sigX && mx <= sigX + 150 && my >= sigY && my <= sigY + 50) {
      dragging = true
      offsetX = mx - sigX
      offsetY = my - sigY
    }
  }

  function deleteField(id) {
    textFields = textFields.filter(f => f.id !== id)
  }

  async function downloadSigned() {
    const bytes = await fetch(pdfUrl).then(r => r.arrayBuffer())
    const pdfDocLib = await PDFDocument.load(bytes)
    const pages = pdfDocLib.getPages()
    const font = await pdfDocLib.embedFont(StandardFonts.Helvetica)

    // Draw text fields
    for (const field of textFields) {
      const page = pages[field.page - 1]
      const scale = canvas.width / page.getWidth()
      page.drawText(field.value, {
        x: field.x / scale,
        y: page.getHeight() - (field.y / scale) - 16,
        size: 13,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
    }

    // Draw signature
    if (signatureData) {
      const page = pages[currentPage - 1]
      const imgBytes = await fetch(signatureData).then(r => r.arrayBuffer())
      const sigImage = await pdfDocLib.embedPng(imgBytes)
      const scale = canvas.width / page.getWidth()
      page.drawImage(sigImage, {
        x: sigX / scale,
        y: page.getHeight() - (sigY / scale) - 60,
        width: 150,
        height: 50,
      })
    }

    const pdfBytes = await pdfDocLib.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'signed-document.pdf'
    link.click()
  }
</script>

<div class="viewer">
  <div class="toolbar">
    <button on:click={prevPage} disabled={currentPage === 1}>◀ Prev</button>
    <span>Page {currentPage} of {totalPages}</span>
    <button on:click={nextPage} disabled={currentPage === totalPages}>Next ▶</button>

    <div class="divider"></div>

    <span class="tool-label">Add field:</span>
    <button
      class="tool-btn {selectedTool === 'name' ? 'active' : ''}"
      on:click={() => selectedTool = selectedTool === 'name' ? null : 'name'}>
      👤 Name
    </button>
    <button
      class="tool-btn {selectedTool === 'date' ? 'active' : ''}"
      on:click={() => selectedTool = selectedTool === 'date' ? null : 'date'}>
      📅 Date
    </button>
    <button
      class="tool-btn {selectedTool === 'text' ? 'active' : ''}"
      on:click={() => selectedTool = selectedTool === 'text' ? null : 'text'}>
      📝 Text
    </button>

    {#if signatureData}
      <button class="download" on:click={downloadSigned}>⬇️ Download Signed PDF</button>
    {/if}
  </div>

  {#if selectedTool}
    <div class="hint">👆 Click anywhere on the PDF to place the {selectedTool} field</div>
  {/if}

  <div
    class="canvas-wrapper"
    on:mousedown={onMouseDown}
    on:mousemove={onMouseMove}
    on:mouseup={onMouseUp}
    on:mouseleave={onMouseUp}
    on:click={handleCanvasClick}
  >
    <canvas bind:this={canvas}></canvas>

    {#if signatureData}
      <img
        src={signatureData}
        class="sig-overlay"
        style="left:{sigX}px; top:{sigY}px; cursor:{dragging ? 'grabbing' : 'grab'};"
        alt="signature"
        draggable="false"
      />
    {/if}

    {#each textFields.filter(f => f.page === currentPage) as field}
      <div
        class="text-field"
        style="left:{field.x}px; top:{field.y}px;"
        on:mousedown={(e) => startDragField(e, field.id)}
      >
        <input
          type="text"
          bind:value={field.value}
          on:click|stopPropagation
        />
        <button class="delete-field" on:click|stopPropagation={() => deleteField(field.id)}>✕</button>
      </div>
    {/each}
  </div>
</div>

<style>
  .viewer { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .toolbar button { padding: 8px 14px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; background: white; font-size: 13px; }
  .toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
  .toolbar span { font-size: 14px; color: #6b7280; }
  .divider { width: 1px; height: 28px; background: #e5e7eb; margin: 0 4px; }
  .tool-label { font-size: 13px; color: #6b7280; font-weight: 500; }
  .tool-btn { background: white; color: #374151; }
  .tool-btn.active { background: #4f46e5 !important; color: white !important; border-color: #4f46e5 !important; }
  .download { background: #4f46e5 !important; color: white !important; border-color: #4f46e5 !important; }
  .hint {
    background: #eef2ff; color: #4f46e5; padding: 8px 16px;
    border-radius: 8px; font-size: 13px; margin-bottom: 12px;
  }
  .canvas-wrapper { position: relative; display: inline-block; cursor: crosshair; }
  canvas { display: block; max-width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; }
  .sig-overlay { position: absolute; width: 150px; height: 50px; user-select: none; }
  .text-field {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(79, 70, 229, 0.08);
    border: 2px dashed #4f46e5;
    border-radius: 6px;
    padding: 2px 6px;
    cursor: grab;
    user-select: none;
  }
  .text-field input {
    border: none;
    background: transparent;
    font-size: 13px;
    color: #1e1b4b;
    outline: none;
    width: 120px;
    cursor: text;
    font-weight: 500;
  }
  .delete-field {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 12px;
    padding: 0 2px;
    line-height: 1;
  }
</style>