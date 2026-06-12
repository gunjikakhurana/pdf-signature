<script>
  import { createEventDispatcher, onMount } from 'svelte'
  const dispatch = createEventDispatcher()

  let canvas
  let isDrawing = false
  let lastX = 0
  let lastY = 0
  let mode = 'draw'
  let typedName = ''
  let selectedFont = 'Dancing Script'

  const fonts = [
    { name: 'Dancing Script', label: 'Cursive' },
    { name: 'Pacifico', label: 'Round' },
    { name: 'Caveat', label: 'Handwritten' },
  ]

  onMount(() => {
    loadFonts()
    initCanvas()
  })

  function loadFonts() {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Caveat:wght@700&display=swap'
    document.head.appendChild(link)
  }

  function initCanvas() {
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1e1b4b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
  }

  function startDrawing(e) {
    if (mode !== 'draw') return
    isDrawing = true
    const rect = canvas.getBoundingClientRect()
    lastX = e.clientX - rect.left
    lastY = e.clientY - rect.top
  }

  function draw(e) {
    if (!isDrawing || mode !== 'draw') return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastX = x
    lastY = y
  }

  function stopDrawing() { isDrawing = false }

  function clearSignature() {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    typedName = ''
  }

  function renderTyped() {
    if (!typedName) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = `48px '${selectedFont}'`
    ctx.fillStyle = '#1e1b4b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
  }

  function saveSignature() {
    const data = canvas.toDataURL('image/png')
    dispatch('sign', { signature: data })
  }
</script>

<div class="pad">
  <div class="mode-tabs">
    <button class:active={mode === 'draw'} on:click={() => { mode = 'draw'; clearSignature() }}>
      ✏️ Draw
    </button>
    <button class:active={mode === 'type'} on:click={() => { mode = 'type'; clearSignature() }}>
      🔤 Type
    </button>
  </div>

  {#if mode === 'type'}
    <div class="type-section">
      <input
        type="text"
        placeholder="Type your name..."
        bind:value={typedName}
        on:input={renderTyped}
      />
      <div class="font-picker">
        {#each fonts as font}
          <button
            class:active={selectedFont === font.name}
            style="font-family: '{font.name}'"
            on:click={() => { selectedFont = font.name; renderTyped() }}
          >
            {font.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <canvas
    bind:this={canvas}
    width="600"
    height="150"
    on:mousedown={startDrawing}
    on:mousemove={draw}
    on:mouseup={stopDrawing}
    on:mouseleave={stopDrawing}
  ></canvas>

  <div class="buttons">
    <button class="clear" on:click={clearSignature}>🗑 Clear</button>
    <button class="save" on:click={saveSignature}>✅ Use Signature</button>
  </div>
</div>

<style>
  .pad {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-top: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .mode-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .mode-tabs button {
    padding: 8px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    color: #6b7280;
  }
  .mode-tabs button.active {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }
  .type-section {
    margin-bottom: 16px;
  }
  .type-section input {
    width: 100%;
    padding: 10px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 16px;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 10px;
  }
  .type-section input:focus { border-color: #4f46e5; }
  .font-picker {
    display: flex;
    gap: 8px;
  }
  .font-picker button {
    padding: 6px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 16px;
    color: #1e1b4b;
  }
  .font-picker button.active {
    border-color: #4f46e5;
    background: #eef2ff;
  }
  canvas {
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: crosshair;
    width: 100%;
    background: #fafafa;
  }
  .buttons { display: flex; gap: 12px; margin-top: 16px; }
  .clear {
    padding: 10px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }
  .save {
    padding: 10px 20px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
  }
</style>