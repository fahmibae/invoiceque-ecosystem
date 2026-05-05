package services

import (
	"fmt"
	"strings"
)

// ─── Professional HTML Email Templates ──────────────────
// Brand colors: Primary Red #DC2626, Dark #1a1a2e, Light BG #f8f9fa

func emailLayout(title, content, footerNote string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%s</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#f0f2f5;">
<tr><td align="center" style="padding:40px 20px;">

<!-- Main Container -->
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#DC2626 0%%,#B91C1C 50%%,#991B1B 100%%);padding:36px 40px;text-align:center;">
	<table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
	<tr>
	<td align="center">
		<div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;margin-bottom:16px;">
			<span style="font-weight:800;font-size:22px;color:#ffffff;letter-spacing:1px;">InvoiceQu</span>
		</div>
		<p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;letter-spacing:0.5px;">Platform Invoice & Payment Link</p>
	</td>
	</tr>
	</table>
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:40px;">
%s
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#f8f9fa;padding:28px 40px;border-top:1px solid #e5e7eb;">
	<table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
	<tr>
	<td align="center">
		%s
		<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
			Email ini dikirim otomatis oleh <strong style="color:#DC2626;">InvoiceQu</strong><br>
			Anda tidak perlu membalas email ini.
		</p>
		<p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
			© 2026 InvoiceQu. All rights reserved.
		</p>
	</td>
	</tr>
	</table>
</td>
</tr>

</table>
<!-- End Main Container -->

</td></tr>
</table>
</body>
</html>`, title, content, footerNote)
}

func statusBadge(text, bgColor, textColor string) string {
	return fmt.Sprintf(`<span style="display:inline-block;background:%s;color:%s;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:0.3px;">%s</span>`, bgColor, textColor, text)
}

func detailRow(label, value string) string {
	return fmt.Sprintf(`
	<tr>
		<td style="padding:10px 16px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">%s</td>
		<td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">%s</td>
	</tr>`, label, value)
}

func detailTable(rows string) string {
	return fmt.Sprintf(`
	<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;margin:20px 0;border:1px solid #e5e7eb;">
	%s
	</table>`, rows)
}

func actionButton(text, url string) string {
	return fmt.Sprintf(`
	<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
	<tr><td align="center">
		<a href="%s" style="display:inline-block;background:linear-gradient(135deg,#DC2626,#EF4444);color:#ffffff;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 4px 14px rgba(220,38,38,0.3);">
			%s
		</a>
	</td></tr>
	</table>`, url, text)
}

// ─── Payment Completed → Client ─────────────────────────

func TemplatePaymentCompletedClient(clientName, paymentTitle, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Pembayaran Berhasil</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Terima kasih atas pembayaran Anda</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Pembayaran Anda telah berhasil diproses. Berikut detail transaksinya:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#065F46;">TOTAL DIBAYAR</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#059669;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Simpan email ini sebagai bukti pembayaran Anda. Jika ada pertanyaan, silakan hubungi penyedia layanan.
	</p>`,
		statusBadge("✓ Berhasil", "#ECFDF5", "#059669"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Deskripsi", escapeHTML(paymentTitle))+
				detailRow("Status", "Lunas")),
		amount,
	)

	return emailLayout("Pembayaran Berhasil - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Terima kasih atas kepercayaan Anda 🙏</p>`)
}

// ─── Payment Completed → Business Owner ─────────────────

func TemplatePaymentCompletedOwner(ownerName, clientName, paymentTitle, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">💰 Pembayaran Diterima!</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Ada pembayaran masuk ke akun Anda</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Kabar baik! Anda telah menerima pembayaran baru.
	</p>

	%s

	<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#065F46;">JUMLAH DITERIMA</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#059669;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Login ke dashboard InvoiceQu untuk melihat detail lengkap.
	</p>`,
		statusBadge("💰 Pembayaran Masuk", "#FEF3C7", "#92400E"),
		escapeHTML(ownerName),
		detailTable(
			detailRow("Pembayar", escapeHTML(clientName))+
				detailRow("Deskripsi", escapeHTML(paymentTitle))+
				detailRow("Status", "Lunas")),
		amount,
	)

	return emailLayout("Pembayaran Diterima - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Dana akan masuk ke saldo Anda 💰</p>`)
}

// ─── Payment Failed → Client ────────────────────────────

func TemplatePaymentFailed(clientName, paymentTitle, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Pembayaran Gagal</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Terjadi masalah saat memproses pembayaran</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi.
	</p>

	%s

	<div style="background:#FEF2F2;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#991B1B;">GAGAL DIPROSES</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Jika masalah berlanjut, silakan hubungi penyedia layanan atau gunakan metode pembayaran lain.
	</p>`,
		statusBadge("✕ Gagal", "#FEF2F2", "#DC2626"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Deskripsi", escapeHTML(paymentTitle))+
				detailRow("Status", "Gagal")),
		amount,
	)

	return emailLayout("Pembayaran Gagal - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Silakan coba lagi atau hubungi support</p>`)
}

// ─── Invoice Created → Client ───────────────────────────

func TemplateInvoiceCreated(clientName, invoiceNum, amount, dueDate, paymentLink, itemsHTML string) string {
	paymentBtn := ""
	if paymentLink != "" {
		paymentBtn = actionButton("💳 Bayar Sekarang", paymentLink) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Atau klik: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, paymentLink, paymentLink)
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice Baru</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Anda memiliki tagihan baru</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Invoice baru telah dibuat untuk Anda. Berikut detailnya:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL TAGIHAN</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#2563EB;">Rp %s</p>
	</div>

	%s

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Mohon lakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.
	</p>`,
		statusBadge("📄 Invoice Baru", "#EFF6FF", "#1D4ED8"),
		escapeHTML(clientName),
		itemsHTML,
		amount,
		paymentBtn,
	)

	return emailLayout("Invoice Baru - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Mohon segera lakukan pembayaran 🙏</p>`)
}

// ─── Invoice Paid → Client ──────────────────────────────

func TemplateInvoicePaid(clientName, invoiceNum, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice Telah Dibayar</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Pembayaran invoice Anda berhasil</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Pembayaran untuk invoice berikut telah diterima dengan baik.
	</p>

	%s

	<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#065F46;">TOTAL DIBAYAR</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#059669;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Simpan email ini sebagai bukti pembayaran. Terima kasih!
	</p>`,
		statusBadge("✓ Lunas", "#ECFDF5", "#059669"),
		escapeHTML(clientName),
		detailTable(
			detailRow("No. Invoice", invoiceNum)+
				detailRow("Status", "Lunas")),
		amount,
	)

	return emailLayout("Invoice Lunas - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Terima kasih atas pembayaran Anda 🙏</p>`)
}

// ─── Invoice Overdue → Client ───────────────────────────

func TemplateInvoiceOverdue(clientName, invoiceNum, amount, dueDate string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice Jatuh Tempo</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Tagihan Anda telah melewati batas waktu</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Invoice berikut telah melewati tanggal jatuh tempo. Mohon segera lakukan pembayaran.
	</p>

	%s

	<div style="background:#FEF2F2;border-radius:12px;padding:20px;text-align:center;margin:24px 0;border:2px dashed #FECACA;">
		<p style="margin:0 0 4px;font-size:13px;color:#991B1B;">⚠️ JATUH TEMPO</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
		<p style="margin:8px 0 0;font-size:12px;color:#B91C1C;">Jatuh tempo: %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Jika Anda sudah melakukan pembayaran, abaikan email ini. Jika belum, mohon segera selesaikan tagihan Anda.
	</p>`,
		statusBadge("⚠ Jatuh Tempo", "#FEF2F2", "#DC2626"),
		escapeHTML(clientName),
		detailTable(
			detailRow("No. Invoice", invoiceNum)+
				detailRow("Jatuh Tempo", dueDate)+
				detailRow("Status", "⚠️ Jatuh Tempo")),
		amount,
		dueDate,
	)

	return emailLayout("Invoice Jatuh Tempo - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Mohon segera lakukan pembayaran</p>`)
}

// ─── Invoice Sent → Client (with payment link) ─────────

func TemplateInvoiceSent(clientName, invoiceNum, amount, dueDate, paymentLink, itemsHTML string) string {
	paymentBtn := ""
	if paymentLink != "" {
		paymentBtn = actionButton("💳 Bayar Sekarang", paymentLink) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Atau klik: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, paymentLink, paymentLink)
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice %s</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Tagihan dari InvoiceQu</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Anda menerima invoice baru. Berikut rinciannya:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL TAGIHAN</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	%s

	<p style="font-size:14px;color:#9ca3af;margin-top:20px;">
		📎 Invoice lengkap terlampir dalam format PDF.
	</p>`,
		statusBadge("📧 Invoice Terkirim", "#EFF6FF", "#1D4ED8"),
		invoiceNum,
		escapeHTML(clientName),
		itemsHTML,
		amount,
		paymentBtn,
	)

	return emailLayout("Invoice "+invoiceNum+" - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Terima kasih atas kepercayaan Anda 🙏</p>`)
}

// ─── Payment Link Created → Client Email ────────────────

func TemplatePaymentLinkCreated(clientName, title, description, amount, paymentURL string) string {
	paymentBtn := ""
	if paymentURL != "" {
		paymentBtn = actionButton("💳 Bayar Sekarang", paymentURL) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Atau klik: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, paymentURL, paymentURL)
	}

	descHTML := ""
	if description != "" {
		descHTML = detailRow("Keterangan", escapeHTML(description))
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Tagihan Pembayaran</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Anda menerima tagihan baru</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Anda telah menerima tagihan pembayaran baru. Berikut rinciannya:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL TAGIHAN</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	%s

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Klik tombol di atas untuk melakukan pembayaran secara aman. Terima kasih.
	</p>`,
		statusBadge("💳 Tagihan Baru", "#EFF6FF", "#1D4ED8"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Deskripsi", escapeHTML(title))+
				descHTML+
				detailRow("Status", "Menunggu Pembayaran")),
		amount,
		paymentBtn,
	)

	return emailLayout("Tagihan Pembayaran - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Mohon segera lakukan pembayaran 🙏</p>`)
}

// ─── Subscription Checkout → User Email ─────────────────

func TemplateSubscriptionCheckout(userName, planName, amount, checkoutURL string, isResend bool) string {
	badgeText := "🛒 Link Pembayaran"
	titleText := "Selesaikan Pembayaran Langganan"
	introText := "Silakan selesaikan pembayaran untuk mengaktifkan langganan Anda."
	if isResend {
		badgeText = "🔄 Link Pembayaran Baru"
		titleText = "Link Pembayaran Baru"
		introText = "Link pembayaran sebelumnya telah kedaluwarsa. Berikut link pembayaran baru untuk Anda."
	}

	paymentBtn := ""
	if checkoutURL != "" {
		paymentBtn = actionButton("💳 Bayar Sekarang", checkoutURL) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Atau klik: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, checkoutURL, checkoutURL)
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">%s</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">%s</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		%s
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL PEMBAYARAN</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
		<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">per bulan</p>
	</div>

	%s

	<div style="background:#FFF7ED;border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid #F59E0B;">
		<p style="margin:0;font-size:13px;color:#92400E;">
			⏰ <strong>Link ini berlaku selama 24 jam.</strong> Setelah itu, Anda perlu meminta link baru.
		</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Setelah pembayaran berhasil, langganan Anda akan langsung aktif. Terima kasih!
	</p>`,
		statusBadge(badgeText, "#EFF6FF", "#1D4ED8"),
		titleText,
		"InvoiceQu Subscription",
		escapeHTML(userName),
		introText,
		detailTable(
			detailRow("Paket", escapeHTML(planName))+
				detailRow("Periode", "Bulanan")+
				detailRow("Status", "Menunggu Pembayaran")),
		amount,
		paymentBtn,
	)

	return emailLayout("Pembayaran Langganan - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Selesaikan pembayaran untuk mengaktifkan langganan 🚀</p>`)
}

// ─── Subscription Activated → User Email ────────────────

func TemplateSubscriptionActivated(userName, planName, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">🎉 Langganan Aktif!</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Selamat! Langganan Anda telah berhasil diaktifkan</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Terima kasih atas pembayaran Anda. Langganan Paket <strong>%s</strong> telah aktif dan siap digunakan!
	</p>

	%s

	<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#065F46;">TOTAL DIBAYAR</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#059669;">Rp %s</p>
	</div>

	<div style="background:#F0FDF4;border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid #22C55E;">
		<p style="margin:0;font-size:13px;color:#166534;">
			✅ Anda sekarang dapat mengakses semua fitur Paket <strong>%s</strong>. Login ke dashboard untuk mulai menggunakan.
		</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Simpan email ini sebagai bukti pembayaran Anda. Terima kasih telah berlangganan InvoiceQu!
	</p>`,
		statusBadge("✅ Aktif", "#ECFDF5", "#059669"),
		escapeHTML(userName),
		escapeHTML(planName),
		detailTable(
			detailRow("Paket", escapeHTML(planName))+
				detailRow("Periode", "Bulanan")+
				detailRow("Status", "✅ Aktif")),
		amount,
		escapeHTML(planName),
	)

	return emailLayout("Langganan Aktif - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Selamat menggunakan InvoiceQu! 🎉</p>`)
}

// ─── Subscription Expired → User Email ──────────────────

func TemplateSubscriptionExpired(userName, planName, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Link Pembayaran Kedaluwarsa</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Link pembayaran langganan Anda telah habis masa berlakunya</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Link pembayaran untuk Paket <strong>%s</strong> telah kedaluwarsa karena melewati batas waktu 24 jam.
	</p>

	%s

	<div style="background:#FEF2F2;border-radius:12px;padding:20px;text-align:center;margin:24px 0;border:2px dashed #FECACA;">
		<p style="margin:0 0 4px;font-size:13px;color:#991B1B;">⚠️ KEDALUWARSA</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	<div style="background:#FFF7ED;border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid #F59E0B;">
		<p style="margin:0;font-size:13px;color:#92400E;">
			💡 <strong>Tidak perlu khawatir!</strong> Anda masih bisa berlangganan. Silakan lakukan checkout ulang melalui dashboard InvoiceQu atau hubungi admin untuk mendapatkan link pembayaran baru.
		</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Jika Anda sudah tidak berminat berlangganan, abaikan email ini. Akun Anda tetap aktif dengan paket Free.
	</p>`,
		statusBadge("⚠ Kedaluwarsa", "#FEF2F2", "#DC2626"),
		escapeHTML(userName),
		escapeHTML(planName),
		detailTable(
			detailRow("Paket", escapeHTML(planName))+
				detailRow("Status", "⚠️ Link Kedaluwarsa")),
		amount,
	)

	return emailLayout("Link Pembayaran Kedaluwarsa - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Lakukan checkout ulang untuk berlangganan</p>`)
}

// ─── Subscription Expiring Soon → User Email (Reminder) ─

func TemplateSubscriptionExpiringSoon(userName, planName, amount, checkoutURL string) string {
	paymentBtn := ""
	if checkoutURL != "" {
		paymentBtn = actionButton("⚡ Bayar Sekarang Sebelum Expire", checkoutURL) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Atau klik: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, checkoutURL, checkoutURL)
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">⏰ 2 Jam Lagi Link Expire!</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Segera selesaikan pembayaran sebelum terlambat</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Halo <strong>%s</strong>,<br>
		Link pembayaran langganan Paket <strong>%s</strong> akan <strong style="color:#DC2626;">kedaluwarsa dalam 2 jam</strong>. Segera lakukan pembayaran agar langganan Anda langsung aktif.
	</p>

	%s

	<div style="background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:12px;padding:20px;text-align:center;margin:24px 0;border:2px solid #F59E0B;">
		<p style="margin:0 0 4px;font-size:13px;color:#92400E;">⏰ SEGERA BAYAR</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#D97706;">Rp %s</p>
		<p style="margin:8px 0 0;font-size:13px;color:#92400E;font-weight:600;">Link expire dalam ~2 jam!</p>
	</div>

	%s

	<div style="background:#FEF2F2;border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid #EF4444;">
		<p style="margin:0;font-size:13px;color:#991B1B;">
			🚨 <strong>Setelah link expire</strong>, Anda harus meminta link pembayaran baru. Bayar sekarang agar tidak perlu mengulangi proses checkout.
		</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Jika Anda sudah membayar, abaikan email ini. Terima kasih!
	</p>`,
		statusBadge("⏰ Segera Bayar!", "#FEF3C7", "#92400E"),
		escapeHTML(userName),
		escapeHTML(planName),
		detailTable(
			detailRow("Paket", escapeHTML(planName))+
				detailRow("Periode", "Bulanan")+
				detailRow("Status", "⏰ Menunggu Pembayaran")),
		amount,
		paymentBtn,
	)

	return emailLayout("Reminder: Segera Bayar Langganan - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Jangan sampai link pembayaran Anda expire! ⏰</p>`)
}

// ─── Helper ─────────────────────────────────────────────

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}
