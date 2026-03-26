export const PASSWORD_RESET_OTP_SUBJECT = "Bella Voce Password Reset OTP";

type PasswordResetOtpTemplatePayload = {
  firstName: string;
  otp: string;
};

export function buildPasswordResetOtpTemplate({ firstName, otp }: PasswordResetOtpTemplatePayload) {
  const text = [
    `Hello ${firstName},`,
    "",
    "We received a request to reset your Bella Voce password.",
    `Your OTP is: ${otp}`,
    "This code will expire in 10 minutes.",
    "",
    "Sing praises",
    "To the Lord",
  ].join("\n");

  const html = `
  <div style="background:#f8fafa;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #cde8e7;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#2ca6a4,#1e8c8a);padding:20px 24px;text-align:center;">
        <img src="cid:bella-voce-logo" alt="Bella Voce" style="display:block;margin:0 auto 10px;max-width:72px;height:auto;" />
        <h2 style="margin:0;font-size:22px;line-height:1.2;color:#ffffff;">Bella Voce Password Reset</h2>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px;">Hello ${firstName},</p>
        <p style="margin:0 0 12px;">We received a request to reset your Bella Voce password.</p>
        <p style="margin:0 0 8px;">Use this one-time password to continue:</p>
        <div style="margin:0 0 16px;padding:16px 18px;border-radius:12px;background:#e8f7f7;border:1px solid #9fd6d5;color:#1e8c8a;font-size:28px;font-weight:700;letter-spacing:0.3em;text-align:center;">
          ${otp}
        </div>
        <p style="margin:0 0 12px;">This code will expire in 10 minutes.</p>
        <p style="margin:0;">Sing praises<br/>To the Lord</p>
      </div>
    </div>
  </div>
  `.trim();

  return { subject: PASSWORD_RESET_OTP_SUBJECT, text, html };
}
