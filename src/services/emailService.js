import { fileURLToPath } from "node:url";
import { mailTransporter } from "../config/mail.js";
import { createAccessEmail } from "../templates/accessEmailTemplate.js";
import { createWorkspaceAccessEmail } from "../templates/workspaceAccessEmailTemplate.js";

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

export async function sendWorkspaceAccessEmail(email, token) {
    const { html, text } = createWorkspaceAccessEmail(email, token);

    await mailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Seu código de acesso ao workspace Astro",
        html,
        text,
        attachments: [{
            filename: "astro-logo.png",
            path: logoPath,
            cid: "astro-logo"
        }]
    });
}
