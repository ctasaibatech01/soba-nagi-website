// 蕎麦切り 凪 — 予約受付サーバー
// public/ を配信し、POST /api/reserve で予約を受け取って、
// Supabase（nagi_reservations テーブル）に保存したうえで、その内容をメールで送る。
// お店の方は /admin でご予約の一覧を見られる（GET /api/reservations で読み出す）。

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

// 予約の保存先（Supabase）の設定（.env に書いてある）
// service_role キーはサーバーの中だけで使う。public/ 側には絶対に置かない。
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
if (!resend) {
  console.warn('⚠ RESEND_API_KEY が .env にありません。予約メールは送信されません。');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env にありません。予約はデータベースに保存されません。');
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

// 予約を Supabase の nagi_reservations テーブルに1件ぶん保存する。
// 保存できたら true、できなかったら false を返す（理由はターミナルに書き出す）。
async function saveReservation({ name, guests, date, time }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/nagi_reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation', // 保存された行を返してもらう（id の確認用）
      },
      body: JSON.stringify({
        name: String(name).trim(),
        guests: Number(guests), // 人数は数字として保存する（1〜6名）
        reserved_date: date,    // 例: 2026-09-10
        reserved_time: time,    // 例: 19:00
      }),
    });

    if (!response.ok) {
      // テーブル側で受け付けられなかった場合（人数が範囲外、日付の形式ちがい など）
      const detail = await response.text();
      console.error(`[保存エラー] Supabase が ${response.status} を返しました:`, detail);
      return false;
    }

    const rows = await response.json();
    const saved = Array.isArray(rows) ? rows[0] : rows;
    console.log(`[保存] nagi_reservations に保存しました (id: ${saved && saved.id})`);
    return true;
  } catch (err) {
    // Supabase に通信できなかった場合など
    console.error('[保存エラー]', err);
    return false;
  }
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

  // まず予約内容をデータベースに残す
  // ここで失敗しても、お客様に断りを出さずメール通知は続ける（予約を取りこぼさないため）
  const saved = await saveReservation({ name, guests, date, time });
  if (!saved) {
    console.warn('⚠ この予約はデータベースに保存できませんでした。メールの内容を控えてください。');
  }

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
        saved ? '' : '※ この予約はデータベースに保存できませんでした。控えをお願いします。',
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
          ${saved ? '' : '<p style="color:#c00;">※ この予約はデータベースに保存できませんでした。控えをお願いします。</p>'}
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

// お店の方が見るご予約一覧のページ
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ご予約一覧の読み出し口（新しいものが先頭にくる）
// 読み出しもサーバーの service_role キーで行う。ブラウザ側には鍵を渡さない。
app.get('/api/reservations', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, message: 'データベースの設定ができていません' });
  }

  // 主な項目だけを、受付の新しい順に取り出す
  const query = new URLSearchParams({
    select: 'id,name,guests,reserved_date,reserved_time,status,created_at',
    order: 'created_at.desc',
    limit: '200',
  });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/nagi_reservations?${query}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[読み出しエラー] Supabase が ${response.status} を返しました:`, detail);
      return res.status(500).json({ ok: false, message: '予約を読み出せませんでした' });
    }

    const reservations = await response.json();
    res.json({ ok: true, reservations });
  } catch (err) {
    console.error('[読み出しエラー]', err);
    res.status(500).json({ ok: false, message: '予約を読み出せませんでした' });
  }
});

// 一覧から状態（status）を変える口
// 受け付ける状態はこの3つだけ。ほかの文字は受け付けない。
const STATUS_CHOICES = ['未確認', '確認済み', 'キャンセル'];

app.patch('/api/reservations/:id/status', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, message: 'データベースの設定ができていません' });
  }

  const { id } = req.params;
  const { status } = req.body || {};

  if (!STATUS_CHOICES.includes(status)) {
    return res.status(400).json({ ok: false, message: '状態の指定がまちがっています' });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/nagi_reservations?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation', // 変えたあとの行を返してもらう
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[状態の変更エラー] Supabase が ${response.status} を返しました:`, detail);
      return res.status(500).json({ ok: false, message: '状態を変えられませんでした' });
    }

    const rows = await response.json();
    const updated = Array.isArray(rows) ? rows[0] : rows;

    // 指定された予約が見つからなかった場合（すでに消されている など）
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'その予約が見つかりませんでした' });
    }

    console.log(`[状態の変更] ${updated.name} 様のご予約を「${updated.status}」にしました`);
    res.json({ ok: true, reservation: updated });
  } catch (err) {
    console.error('[状態の変更エラー]', err);
    res.status(500).json({ ok: false, message: '状態を変えられませんでした' });
  }
});

// 一覧から予約の内容（お名前・人数・日にち・時間）を直す口
app.patch('/api/reservations/:id', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, message: 'データベースの設定ができていません' });
  }

  const { id } = req.params;
  const { name, guests, date, time } = req.body || {};

  // お名前：空はだめ。長すぎるものも断る。
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return res.status(400).json({ ok: false, message: 'お名前を入れてください' });
  }
  if (trimmedName.length > 100) {
    return res.status(400).json({ ok: false, message: 'お名前が長すぎます' });
  }

  // 人数：1〜6名のあいだの数字だけ（テーブル側の決まりと同じ）
  const guestCount = Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 6) {
    return res.status(400).json({ ok: false, message: '人数は1〜6名で入れてください' });
  }

  // 日にち：2026-09-10 の形
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, message: '日にちの形がちがいます' });
  }

  // 時間：19:00 または 19:00:00 の形
  if (typeof time !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return res.status(400).json({ ok: false, message: '時間の形がちがいます' });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/nagi_reservations?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation', // 直したあとの行を返してもらう
        },
        body: JSON.stringify({
          name: trimmedName,
          guests: guestCount,
          reserved_date: date,
          reserved_time: time,
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[予約の変更エラー] Supabase が ${response.status} を返しました:`, detail);
      return res.status(500).json({ ok: false, message: '予約を直せませんでした' });
    }

    const rows = await response.json();
    const updated = Array.isArray(rows) ? rows[0] : rows;

    // 指定された予約が見つからなかった場合（すでに消されている など）
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'その予約が見つかりませんでした' });
    }

    console.log(
      `[予約の変更] ${updated.name} 様 / ${updated.guests}名 / ${updated.reserved_date} ${updated.reserved_time}`
    );
    res.json({ ok: true, reservation: updated });
  } catch (err) {
    console.error('[予約の変更エラー]', err);
    res.status(500).json({ ok: false, message: '予約を直せませんでした' });
  }
});

app.listen(PORT, () => {
  console.log(`サーバーを起動しました  http://localhost:${PORT}`);
});
