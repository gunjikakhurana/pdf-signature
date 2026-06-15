<script>
  import { createEventDispatcher, onMount } from 'svelte'
  const dispatch = createEventDispatcher()

  let canvas
  let isDrawing = false
  let points = []
  let mode = 'draw'
  let typedName = ''
  let selectedFont = 'Dancing Script'
  let hasContent = false

  const fonts = [
    { name: 'Dancing Script', label: 'Script' },
    { name: 'Pacifico', label: 'Round' },
    { name: 'Caveat', label: 'Casual' },
  ]

  onMount(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Caveat:wght@700&display=swap'
    document.head.appendChild(link)
    initCanvas()
  })

  function initCanvas() {
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#0f172a'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  function getStrokeWidth(p1, p2) {
    // Thicker when moving slow, thinner when moving fast — simulates pen pressure
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    const speed = dist // higher = faster
    const minWidth = 1.2
    const maxWidth = 3.5
    return Math.max(minWidth, maxWidth - speed * 0.08)
  }

  function drawSmoothCurve() {
    if (points.length < 3) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Re-render existing strokes from scratch using stored strokes
    renderStrokes()
  }

  let strokes = [] // array of point arrays
  let currentStroke = []

  function startDrawing(e) {
    if (mode !== 'draw') return
    e.preventDefault()
    isDrawing = true
    currentStroke = []
    const pos = getPos(e)
    currentStroke.push(pos)
  }

  function draw(e) {
    if (!isDrawing || mode !== 'draw') return
    e.preventDefault()
    const pos = getPos(e)
    currentStroke.push(pos)
    hasContent = true

    // Live render
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    renderAllStrokes([...strokes, currentStroke])
  }

  function stopDrawing() {
    if (!isDrawing) return
    isDrawing = false
    if (currentStroke.length > 1) {
      strokes.push([...currentStroke])
    }
    currentStroke = []
  }

  function renderAllStrokes(allStrokes) {
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#0f172a'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of allStrokes) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)

      for (let i = 1; i < stroke.length - 1; i++) {
        const p0 = stroke[i - 1]
        const p1 = stroke[i]
        const p2 = stroke[i + 1]
        // Midpoints for smooth quadratic curves
        const midX1 = (p0.x + p1.x) / 2
        const midY1 = (p0.y + p1.y) / 2
        const midX2 = (p1.x + p2.x) / 2
        const midY2 = (p1.y + p2.y) / 2

        ctx.lineWidth = getStrokeWidth(p0, p1)
        ctx.quadraticCurveTo(p1.x, p1.y, midX2, midY2)
      }

      // Draw last segment
      const last = stroke[stroke.length - 1]
      const prev = stroke[stroke.length - 2]
      ctx.lineWidth = getStrokeWidth(prev, last)
      ctx.lineTo(last.x, last.y)
      ctx.stroke()
    }
  }

  function renderStrokes() {
    renderAllStrokes(strokes)
  }

  function clearSignature() {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    typedName = ''
    hasContent = false
    strokes = []
    currentStroke = []
  }

  function renderTyped() {
    if (!typedName) { hasContent = false; return }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = `52px '${selectedFont}'`
    ctx.fillStyle = '#0f172a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
    hasContent = true
  }

  function saveSignature() {
    const data = canvas.toDataURL('image/png')
    dispatch('sign', { signature: data })
  }

  function switchMode(m) {
    mode = m
    clearSignature()
  }
</script>

<div class="pad">
  <div class="pad-header">
    <div class="pad-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      </svg>
      <span>Add signature</span>
    </div>
    <div class="mode-tabs">
      <button class:active={mode === 'draw'} on:click={() => switchMode('draw')}>Draw</button>
      <button class:active={mode === 'type'} on:click={() => switchMode('type')}>Type</button>
    </div>
  </div>

  {#if mode === 'type'}
    <div class="type-section">
      <input
        type="text"
        placeholder="Type your full name…"
        bind:value={typedName}
        on:input={renderTyped}
      />
      <div class="font-picker">
        {#each fonts as font}
          <button
            class:active={selectedFont === font.name}
            style="font-family: '{font.name}', cursive"
            on:click={() => { selectedFont = font.name; renderTyped() }}
          >
            {font.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="canvas-wrap" class:has-content={hasContent}>
    {#if !hasContent}
      <div class="canvas-hint">
        {mode === 'draw' ? 'Draw your signature here' : 'Preview will appear here'}
      </div>
    {/if}
    <canvas
      bind:this={canvas}
      width="700"
      height="160"
      on:mousedown={startDrawing}
      on:mousemove={draw}
      on:mouseup={stopDrawing}
      on:mouseleave={stopDrawing}
      on:touchstart={startDrawing}
      on:touchmove={draw}
      on:touchend={stopDrawing}
    ></canvas>
  </div>

  <div class="pad-footer">
    <button class="clear-btn" on:click={clearSignature}>Clear</button>
    <button class="use-btn" on:click={saveSignature} disabled={!hasContent}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Use signature
    </button>
  </div>
</div>

<style>
  .pad {
    background: white;
    border: 1px solid #e8e5e0;
    border-radius: 14px;
    overflow: hidden;
  }

  .pad-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .pad-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
  }

  .mode-tabs {
    display: flex;
    background: #f5f4f2;
    border: 1px solid #e8e5e0;
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }

  .mode-tabs button {
    padding: 5px 14px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }

  .mode-tabs button.active {
    background: white;
    color: #0f172a;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .type-section {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .type-section input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    outline: none;
    color: #0f172a;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .type-section input:focus { border-color: #1a1a2e; }
  .type-section input::placeholder { color: #cbd5e1; }

  .font-picker { display: flex; gap: 8px; }

  .font-picker button {
    padding: 6px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 15px;
    color: #1e1b4b;
    transition: all 0.15s;
    font-family: inherit;
  }

  .font-picker button.active {
    border-color: #1a1a2e;
    background: #f5f4f2;
  }

  .canvas-wrap {
    position: relative;
    padding: 16px 20px;
    background: #fafaf9;
  }

  .canvas-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 13px;
    color: #cbd5e1;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
  }

  canvas {
    display: block;
    width: 100%;
    border: 1.5px dashed #e2e8f0;
    border-radius: 8px;
    cursor: crosshair;
    background: white;
    touch-action: none;
  }

  .has-content canvas { border-style: solid; border-color: #e8e5e0; }

  .pad-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid #f1f5f9;
  }

  .clear-btn {
    padding: 8px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  .clear-btn:hover { border-color: #94a3b8; color: #0f172a; }

  .use-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 18px;
    background: #1a1a2e;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  .use-btn:hover { background: #2d2d4e; }
  .use-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>