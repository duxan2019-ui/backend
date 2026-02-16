import express, {Router} from "express";
import {db} from "../db.js";
import * as crypto from "crypto"

const router = Router();
export default router;

const app = express();
function loginCodeEmailHtml(code, minutes = 10, appName = "Scoro") {
    return `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Dein Code: ${code} (gültig ${minutes} Minuten)
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width:520px;width:100%;">
            <tr>
              <td style="background:#ffffff;border:1px solid #e6e8f0;border-radius:14px;padding:22px;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
                  <div style="font-size:16px;font-weight:700;margin:0 0 10px;">
                    Anmeldecode
                  </div>

                  <div style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 16px;">
                    Bitte gib diesen Code ein. Er ist <b>${minutes}</b> Minuten gültig.
                  </div>

                  <div style="text-align:center;margin:0 0 16px;">
                    <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;
                      font-size:28px;font-weight:800;letter-spacing:6px;padding:12px 16px;border-radius:12px;
                      background:#f3f4f6;border:1px dashed #d1d5db;color:#111827;">
                      ${code}
                    </span>
                  </div>

                  <div style="font-size:12px;line-height:1.6;color:#9ca3af;margin:0;">
                    Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail ignorieren.
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 6px 0;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;text-align:center;">
                  Automatische Nachricht – bitte nicht antworten. © ${appName}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}



// ожидаются твои функции:
// - is_correct_Email(email)
// - generate_secret_key()
// - loginCodeEmailHtml(code)
// - hashOtp(code)

export async function sendLoginCode(emailRaw) {
    const email = String(emailRaw ?? "").trim().toLowerCase();
    if (!is_correct_Email(email)) {
        return { ok: false, status: 400, error: "Email is invalid" };
    }

    const code = generate_secret_key(); // строка/число
    const html = loginCodeEmailHtml(code);

    try {
        const result = await db.$transaction(async (tx) => {
            const user = await tx.user.upsert({
                where: { email },
                update: {},
                create: { email, avalible_balance: 1000, frozen_balance: 0 },
            });

            const codeObj = await tx.code.findUnique({ where: { userId: user.id } });

            if (codeObj) {
                const canSendAgain = Date.now() - codeObj.created_at.getTime() >= 5 * 60 * 1000;
                if (!canSendAgain) return { kind: "wait" };
            }

            await tx.code.upsert({
                where: { userId: user.id },
                update: { hashed_code: hashOtp(code), created_at: new Date() },
                create: { userId: user.id, hashed_code: hashOtp(code) },
            });

            return { kind: "ok" };
        });

        if (result.kind === "wait") {
            return { ok: false, status: 429, error: "Try again later" };
        }

        const response = await fetch("https://mail.qsk.me/api/send", {
            method: "POST",
            headers: {
                Authorization: process.env.email_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: email,
                from: "noreply@shov.studio",
                subject: "Bestätigungscode",
                html,
                use_html: true,
            }),
        });

        let payload;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        const success = Boolean(payload?.success);

        if (!response.ok || !success) {
            return { ok: false, status: 400, error: "Email was not sent" };
        }

        return { ok: true, status: 200, data: { status: "success" } };
    } catch (err) {
        return { ok: false, status: 500, error: String(err) };
    }
}
export function is_correct_Email(email) {
    if (typeof email !== "string") return false;
    return email.trim().toLowerCase().endsWith("@htlstp.at");
}
function generate_secret_key() {
    return Math.floor(100000 + Math.random() * 900000);
}
function hashOtp(code) {
    return crypto.createHmac("sha256", process.env.OTP_SECRET).update(String(code)).digest("hex");
}
export function verifyOtpWithExpiry(codeFromUser, codeObj, ttlMinutes = 10) {
    if (!codeObj?.hashed_code || !codeObj?.created_at) return { ok: false, reason: "NO_CODE" };
    const expiresAt = new Date(codeObj.created_at.getTime() + ttlMinutes * 60 * 1000);
    if (expiresAt <= new Date()) return { ok: false, reason: "EXPIRED" };
    const ok = hashOtp(codeFromUser) === codeObj.hashed_code;
    if (!ok) return { ok: false, reason: "WRONG" };
    return { ok: true };
}


