// 蕎麦切り 凪 — 予約受付サーバー
// public/ を配信し、POST /api/reserve で予約を受け取って、その内容をメールで送る。

require('dotenv').config(); // .env の設定を読み込む

const path = require('path');
const express = require('express');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// メール送信の設定（.env に書いてある）
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_TO = process.env.MAIL_TO;
const MAIL_FROM = process.env.MAIL_FROM;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
if (!resend) {
  console.warn('⚠ RESEND_API_KEY が .env にありません。予約メールは送信されません。');
}

// JSON 形式の送信内容を読めるようにする
app.use(express.json());

// public フォルダの中のページをそのまま配信する
app.use(express.static(path.join(__dirname, 'public')));

// メール本文に入れる文字をそのまま安全に表示できるようにする
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 予約の受け口
app.post('/api/reserve', async (req, res) => {
  const { name, guests, date, time } = req.body || {};

  // 4項目がそろっていない予約は受け付けない
  if (!name || !guests || !date || !time) {
    return res.status(400).json({ ok: false, message: '入力内容が足りません' });
  }

  // 予約が来たことをターミナルに一行で書き出す
  console.log(`[予約] ${date} ${time} / ${name} 様 / ${guests}名`);

  if (!resend) {
    return res.status(500).json({ ok: false, message: 'メールの設定ができていません' });
  }

  // 予約内容をメールで知らせる
  try {
    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject: `【予約】${date} ${time} / ${name} 様 / ${guests}名`,
      text: [
        '新しいご予約が入りました。',
        '',
        `お名前：${name} 様`,
        `人数　：${guests}名`,
        `日にち：${date}`,
        `時間　：${time}`,
        '',
        '― 蕎麦切り 凪 予約フォーム',
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;line-height:1.8;">
          <p>新しいご予約が入りました。</p>
          <table cellpadding="6" style="border-collapse:collapse;">
            <tr><td><strong>お名前</strong></td><td>${escapeHtml(name)} 様</td></tr>
            <tr><td><strong>人数</strong></td><td>${escapeHtml(guests)}名</td></tr>
            <tr><td><strong>日にち</strong></td><td>${escapeHtml(date)}</td></tr>
            <tr><td><strong>時間</strong></td><td>${escapeHtml(time)}</td></tr>
          </table>
          <p style="color:#888;font-size:13px;">― 蕎麦切り 凪 予約フォーム</p>
        </div>
      `,
    });

    if (error) {
      // Resend 側で受け付けられなかった場合
      console.error('[メール送信エラー]', error);
      return res.status(500).json({ ok: false, message: 'メールを送信できませんでした' });
    }

    console.log(`[メール送信] ${MAIL_TO} 宛に送信しました (id: ${data && data.id})`);
  } catch (err) {
    // 通信できなかった場合など
    console.error('[メール送信エラー]', err);
    return res.status(500).json({ ok: false, message: 'メールを送信できませんでした' });
  }

  // 送った人に返す
  res.json({ ok: true, message: 'ご予約を受け付けました' });
});

app.listen(PORT, () => {
  console.log(`サーバーを起動しました  http://localhost:${PORT}`);
});
