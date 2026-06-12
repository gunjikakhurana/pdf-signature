<script>
  import { createEventDispatcher } from 'svelte'
  import { supabase } from './supabase.js'

  const dispatch = createEventDispatcher()

  let email = ''
  let password = ''
  let isLogin = true
  let loading = false
  let error = ''
  let message = ''

  async function handleSubmit() {
    loading = true
    error = ''
    message = ''
    if (isLogin) {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { error = err.message }
      else { dispatch('loggedin', { user: data.user }) }
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { error = err.message }
      else { message = '✅ Account created! You can now log in.'; isLogin = true }
    }
    loading = false
  }
</script>

<div class="auth-wrap">
  <div class="auth-box">
    <div class="logo-wrap">
      <div class="logo-mark">✍️</div>
    </div>
    <h2>SignFlow</h2>
    <p class="sub">{isLogin ? 'Sign in to your account' : 'Create your account'}</p>

    {#if error}<div class="error">{error}</div>{/if}
    {#if message}<div class="success">{message}</div>{/if}

    <div class="field">
      <label>Email</label>
      <input type="email" placeholder="you@example.com" bind:value={email} />
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" placeholder="••••••••" bind:value={password} />
    </div>

    <button class="submit" on:click={handleSubmit} disabled={loading}>
      {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
    </button>

    <p class="toggle">
      {isLogin ? "Don't have an account?" : 'Already have an account?'}
      <button class="link" on:click={() => { isLogin = !isLogin; error = ''; message = '' }}>
        {isLogin ? 'Sign up' : 'Sign in'}
      </button>
    </p>
  </div>
</div>

<style>
  .auth-wrap {
    min-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .auth-box {
    background: white;
    border: 1px solid #ede9fe;
    border-radius: 20px;
    padding: 40px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  }

  .logo-wrap { margin-bottom: 20px; }

  .logo-mark {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    margin: 0 auto;
  }

  h2 {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 6px;
  }

  .sub {
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 28px;
  }

  .error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .success {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .field { text-align: left; margin-bottom: 16px; }

  .field label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .field input {
    width: 100%;
    padding: 11px 14px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    background: white;
  }

  .field input::placeholder { color: #94a3b8; }

  .submit {
    width: 100%;
    padding: 12px;
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 4px;
    transition: background 0.15s;
  }

  .submit:hover { background: #6d28d9; }
  .submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .toggle { margin-top: 20px; font-size: 13px; color: #94a3b8; }

  .link {
    background: none;
    border: none;
    color: #7c3aed;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    padding: 0;
  }

  .link:hover { color: #6d28d9; }
</style>