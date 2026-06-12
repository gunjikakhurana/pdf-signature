import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

const resend = new Resend('re_FrFy4pP6_DYeBaDJAfAZD1rQXZ4dsG5vt')
const supabase = createClient('https://diapfhpxnccicemnfbjb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYXBmaHB4bmNjaWNlbW5mYmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Nzg2OTEsImV4cCI6MjA5NjI1NDY5MX0.OE55YcEGy3L-TIfpWYOqvQb5uKsZ-y5hNYTzo6zk3PQ')

app.post('/send-signing-request', async (req, res) => {
  const { signers, filename, documentId } = req.body

  // Save all signers to DB in order
  const signerRows = signers.map((email, i) => ({
    document_id: documentId,
    email,
    order_index: i,
    status: 'pending'
  }))

  const { data: savedSigners, error } = await supabase
    .from('signers')
    .insert(signerRows)
    .select()

  if (error) return res.status(400).json({ error })

  // Send email only to the FIRST signer
  const firstSigner = savedSigners.find(s => s.order_index === 0)

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'gunjikakhurana@gmail.com',
    subject: `Please sign: ${filename}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>You have a document to sign</h2>
        <p>You are <strong>signer 1</strong> for <strong>${filename}</strong>.</p>
        <a href="http://localhost:5173/sign/${firstSigner.token}"
           style="background: #4f46e5; color: white; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Sign Document
        </a>
        <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">
          After you sign, the next person will be notified automatically.
        </p>
      </div>
    `
  })

  res.json({ success: true })
})

app.post('/complete-signing', async (req, res) => {
  const { token, filename } = req.body

  // Mark current signer as signed
  const { data: current } = await supabase
    .from('signers')
    .update({ status: 'signed', signed_at: new Date().toISOString() })
    .eq('token', token)
    .select()
    .single()

  if (!current) return res.status(404).json({ error: 'Signer not found' })

  // Find next pending signer for this document
  const { data: next } = await supabase
    .from('signers')
    .select()
    .eq('document_id', current.document_id)
    .eq('status', 'pending')
    .order('order_index')
    .limit(1)
    .single()

  if (next) {
    // Send email to next signer
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to:'gunjikakhurana@gmail.com',
      subject: `Please sign: ${filename}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>You have a document to sign</h2>
          <p>You are <strong>signer ${next.order_index + 1}</strong> for <strong>${filename}</strong>.</p>
          <a href="http://localhost:5173/sign/${next.token}"
             style="background: #4f46e5; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Sign Document
          </a>
        </div>
      `
    })
    res.json({ success: true, next: next.email })
  } else {
    // All signed — update document status
    await supabase
      .from('documents')
      .update({ status: 'signed' })
      .eq('id', current.document_id)

    // Get document details
    const { data: doc } = await supabase
      .from('documents')
      .select('filename')
      .eq('id', current.document_id)
      .single()

    // Send completion email to owner
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'gunjikakhurana@gmail.com',
      subject: `✅ All signatures collected: ${doc.filename}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: #4f46e5; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Document Fully Signed</h1>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px;">Great news! All signers have completed signing:</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; font-weight: 600; color: #1e1b4b; font-size: 18px;">📄 ${doc.filename}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Signed on ${new Date().toLocaleString('en-IN', { 
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
            <a href="http://localhost:5173" 
               style="background: #4f46e5; color: white; padding: 12px 24px; 
                      border-radius: 8px; text-decoration: none; 
                      display: inline-block; margin-top: 8px; font-size: 14px;">
              View Dashboard
            </a>
          </div>
        </div>
      `
    })

    res.json({ success: true, allSigned: true })
  }
})

app.listen(3001, () => console.log('Email server running on port 3001'))