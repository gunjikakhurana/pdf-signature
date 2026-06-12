<script>
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  let dragging = false

  function handleFile(file) {
    if (file && file.type === 'application/pdf') {
      dispatch('upload', { file })
    } else {
      alert('Please upload a PDF file!')
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    dragging = false
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleInput(e) {
    handleFile(e.target.files[0])
  }
</script>

<div
  class="uploader"
  class:dragging
  on:dragover|preventDefault={() => dragging = true}
  on:dragleave={() => dragging = false}
  on:drop={handleDrop}
>
  <div class="icon">📄</div>
  <h2>Upload your PDF</h2>
  <p>Drag & drop your PDF here or click to browse</p>
  <label class="btn">
    Choose PDF
    <input type="file" accept=".pdf" on:change={handleInput} hidden />
  </label>
</div>

<style>
  .uploader {
    border: 3px dashed #4f46e5;
    border-radius: 16px;
    padding: 60px 40px;
    text-align: center;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  .uploader.dragging { background: #eef2ff; border-color: #3730a3; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h2 { font-size: 24px; color: #1e1b4b; margin-bottom: 8px; }
  p { color: #6b7280; margin-bottom: 24px; }
  .btn {
    background: #4f46e5;
    color: white;
    padding: 12px 28px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
  }
</style>