import { z } from "zod";
import { AppDataSource } from "../../database";
import { config } from "../../config";
import { mailConfigured, sendMail } from "../../shared/mail";
import { emailRows, emailShell } from "../../shared/emailTemplate";
import { badRequest } from "../../shared/errors";
import { ContactEnquiry } from "./contact-enquiry.entity";

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  company: z.string().trim().max(200).optional().nullable(),
  plan: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

export async function submitEnquiry(body: unknown) {
  const parsed = enquirySchema.safeParse(body ?? {});
  if (!parsed.success) throw badRequest("Please fill in your name, email and message");
  const { name, email, company, plan, message } = parsed.data;

  const repo = AppDataSource.getRepository(ContactEnquiry);
  const enquiry = await repo.save(repo.create({ name, email, company: company || null, plan: plan || null, message: message || null }));

  const toList = config.contactTo.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (toList.length > 0 && mailConfigured()) {
    const to = toList.join(", ");
    const planLabel = plan || "General";
    const subject = `New Call CRM enquiry — ${planLabel} plan`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${company || "-"}`,
      `Plan: ${planLabel}`,
      ``,
      `Message:`,
      message || "-",
    ].join("\n");
    const html = emailShell(
      "New plan enquiry",
      emailRows([
        ["Name", name],
        ["Email", email],
        ["Company", company || "-"],
        ["Plan", planLabel],
      ]) +
        (message
          ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:10px;font-size:14px;color:#334155;line-height:1.6;">${message.replace(/</g, "&lt;")}</div>`
          : ""),
    );
    // Admin copy + confirmation copy to the person who submitted the form.
    await sendMail({ to, subject, text, html }).catch((e) => console.error("Enquiry email failed:", e));
    if (email && !toList.includes(email.toLowerCase())) {
      await sendMail({
        to: email,
        subject: "We received your Call CRM enquiry",
        text: `Hi ${name},\n\nThanks for reaching out! We got your enquiry${plan ? ` about the ${planLabel} plan` : ""} and will contact you shortly.\n\n— Call CRM Team`,
        html: emailShell(
          "We received your enquiry",
          `<p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 14px;">Hi ${name.replace(/</g, "&lt;")},</p>
           <p style="font-size:14px;color:#334155;line-height:1.6;margin:0;">Thanks for reaching out! We got your enquiry${plan ? ` about the <b>${planLabel}</b> plan` : ""} and our team will contact you shortly.</p>`,
        ),
      }).catch((e) => console.error("Enquiry user copy failed:", e));
    }
  } else {
    console.log(`New enquiry #${enquiry.id} stored (email not configured)`);
  }

  return { ok: true };
}
