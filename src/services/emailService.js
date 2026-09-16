import { fileURLToPath } from "node:url";
import { mailTransporter } from "../config/mail.js";
import { createAccessEmail } from "../templates/accessEmailTemplate.js";

const logoPath = fileURLToPath(new URL("../assets/astro-logo.png", import.meta.url));

export async function sendAccessEmail(employee, token) {
    const { html, text } = createAccessEmail(employee, token);

    await mailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: employee.email,
        subject: "Seu código de primeiro acesso ao Astro",
        html,
        text,
        attachments: [{
            filename: "astro-logo.png",
            path: logoPath,
            cid: "astro-logo"
        }]
    });
}
