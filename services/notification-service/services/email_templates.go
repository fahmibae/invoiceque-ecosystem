package services

import (
	"fmt"
	"strings"
)

// ─── Professional HTML Email Templates ──────────────────
// Brand colors: Primary Red #DC2626, Dark #1a1a2e, Light BG #f8f9fa

func emailLayout(title, content, footerNote string) string {
	return emailLayoutWithLocale(title, content, footerNote, "id")
}

func clientEmailLayout(title, content, footerNote string) string {
	return emailLayoutWithLocale(title, content, footerNote, "en")
}

func emailLayoutWithLocale(title, content, footerNote, lang string) string {
	tagline := "Platform Invoice & Payment Link"
	autoText := "Email ini dikirim otomatis oleh"
	replyText := "Anda tidak perlu membalas email ini."
	if lang == "en" {
		tagline = "Invoice & Payment Link Platform"
		autoText = "This email was sent automatically by"
		replyText = "You do not need to reply to this email."
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="%s">
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
		<p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;letter-spacing:0.5px;">%s</p>
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
			%s <strong style="color:#DC2626;">InvoiceQu</strong><br>
			%s
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
</html>`, lang, title, tagline, content, footerNote, autoText, replyText)
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
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Payment Successful</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Thank you for your payment</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		Your payment has been processed successfully. Here are the transaction details:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#065F46;">TOTAL PAID</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#059669;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Please keep this email as your payment receipt. If you have any questions, contact the service provider.
	</p>`,
		statusBadge("✓ Paid", "#ECFDF5", "#059669"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Description", escapeHTML(paymentTitle))+
				detailRow("Status", "Paid")),
		amount,
	)

	return clientEmailLayout("Payment Successful - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Thank you for your trust.</p>`)
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
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Payment Failed</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">We could not process your payment</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		Sorry, your payment could not be processed. Please try again.
	</p>

	%s

	<div style="background:#FEF2F2;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#991B1B;">FAILED TO PROCESS</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		If the issue continues, contact the service provider or use another payment method.
	</p>`,
		statusBadge("✕ Failed", "#FEF2F2", "#DC2626"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Description", escapeHTML(paymentTitle))+
				detailRow("Status", "Failed")),
		amount,
	)

	return clientEmailLayout("Payment Failed - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Please try again or contact support.</p>`)
}

// ─── Invoice Created → Client ───────────────────────────

func TemplateInvoiceCreated(clientName, invoiceNum, amount, dueDate, paymentLink, itemsHTML string) string {
	paymentBtn := ""
	if paymentLink != "" {
		paymentBtn = actionButton("Pay Now", paymentLink) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Or open this link: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, paymentLink, paymentLink)
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">New Invoice</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">You have a new invoice</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		A new invoice has been issued for you. Here are the details:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL DUE</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#2563EB;">Rp %s</p>
	</div>

	%s

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Please complete the payment before the due date. Thank you.
	</p>`,
		statusBadge("New Invoice", "#EFF6FF", "#1D4ED8"),
		escapeHTML(clientName),
		itemsHTML,
		amount,
		paymentBtn,
	)

	return clientEmailLayout("New Invoice - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Please complete your payment at your earliest convenience.</p>`)
}

// ─── Invoice Paid → Client ──────────────────────────────

func TemplateInvoicePaid(clientName, invoiceNum, amount string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice Paid</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Your invoice payment was successful</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		Your payment for the following invoice has been received.
	</p>

	%s

	<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#065F46;">TOTAL PAID</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#059669;">Rp %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Please keep this email as your payment receipt. Thank you.
	</p>`,
		statusBadge("✓ Paid", "#ECFDF5", "#059669"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Invoice No.", invoiceNum)+
				detailRow("Status", "Paid")),
		amount,
	)

	return clientEmailLayout("Invoice Paid - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Thank you for your payment.</p>`)
}

// ─── Invoice Overdue → Client ───────────────────────────

func TemplateInvoiceOverdue(clientName, invoiceNum, amount, dueDate string) string {
	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice Overdue</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">This invoice has passed its due date</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		The following invoice is overdue. Please complete the payment as soon as possible.
	</p>

	%s

	<div style="background:#FEF2F2;border-radius:12px;padding:20px;text-align:center;margin:24px 0;border:2px dashed #FECACA;">
		<p style="margin:0 0 4px;font-size:13px;color:#991B1B;">OVERDUE</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
		<p style="margin:8px 0 0;font-size:12px;color:#B91C1C;">Due date: %s</p>
	</div>

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		If you have already paid, please ignore this email. Otherwise, please settle the invoice.
	</p>`,
		statusBadge("Overdue", "#FEF2F2", "#DC2626"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Invoice No.", invoiceNum)+
				detailRow("Due Date", dueDate)+
				detailRow("Status", "Overdue")),
		amount,
		dueDate,
	)

	return clientEmailLayout("Invoice Overdue - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Please complete your payment soon.</p>`)
}

// ─── Invoice Sent → Client (with payment link) ─────────

func TemplateInvoiceSent(clientName, invoiceNum, amount, dueDate, paymentLink, itemsHTML string) string {
	paymentBtn := ""
	if paymentLink != "" {
		paymentBtn = actionButton("Pay Now", paymentLink) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Or open this link: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, paymentLink, paymentLink)
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Invoice %s</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">Invoice from InvoiceQu</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		You have received a new invoice. Here are the details:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL DUE</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	%s

	<p style="font-size:14px;color:#9ca3af;margin-top:20px;">
		The full invoice is attached as a PDF.
	</p>`,
		statusBadge("Invoice Sent", "#EFF6FF", "#1D4ED8"),
		invoiceNum,
		escapeHTML(clientName),
		itemsHTML,
		amount,
		paymentBtn,
	)

	return clientEmailLayout("Invoice "+invoiceNum+" - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Thank you for your trust.</p>`)
}

// ─── Payment Link Created → Client Email ────────────────

func TemplatePaymentLinkCreated(clientName, title, description, amount, paymentURL string) string {
	paymentBtn := ""
	if paymentURL != "" {
		paymentBtn = actionButton("Pay Now", paymentURL) +
			fmt.Sprintf(`<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:-12px;">
				Or open this link: <a href="%s" style="color:#DC2626;">%s</a>
			</p>`, paymentURL, paymentURL)
	}

	descHTML := ""
	if description != "" {
		descHTML = detailRow("Notes", escapeHTML(description))
	}

	content := fmt.Sprintf(`
	<div style="text-align:center;margin-bottom:28px;">
		%s
		<h2 style="margin:20px 0 8px;font-size:22px;color:#111827;">Payment Request</h2>
		<p style="margin:0;font-size:15px;color:#6b7280;">You have received a new payment request</p>
	</div>

	<p style="font-size:15px;color:#374151;line-height:1.7;">
		Hi <strong>%s</strong>,<br>
		You have received a new payment request. Here are the details:
	</p>

	%s

	<div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
		<p style="margin:0 0 4px;font-size:13px;color:#1E40AF;">TOTAL DUE</p>
		<p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;">Rp %s</p>
	</div>

	%s

	<p style="font-size:14px;color:#6b7280;line-height:1.6;">
		Click the button above to complete your payment securely. Thank you.
	</p>`,
		statusBadge("Payment Request", "#EFF6FF", "#1D4ED8"),
		escapeHTML(clientName),
		detailTable(
			detailRow("Description", escapeHTML(title))+
				descHTML+
				detailRow("Status", "Awaiting Payment")),
		amount,
		paymentBtn,
	)

	return clientEmailLayout("Payment Request - InvoiceQu", content,
		`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Please complete your payment at your earliest convenience.</p>`)
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
