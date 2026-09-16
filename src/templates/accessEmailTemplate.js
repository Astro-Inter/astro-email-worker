function escapeHtml(value) {
    return String(value ?? "-").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

export function createAccessEmail(employee, token) {
    const name = escapeHtml(employee.nome);
    const email = escapeHtml(employee.email);
    const workspace = escapeHtml(employee.workspace);
    const unit = escapeHtml(employee.unidade);
    const role = escapeHtml(employee.cargo);
    const accessToken = escapeHtml(token);

    const html = `
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Primeiro acesso ao Astro</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f2f8;font-family:Arial,Helvetica,sans-serif;color:#1c1839;">
    <div style="display:none;font-size:1px;line-height:1px;color:#f4f2f8;max-height:0;max-width:0;opacity:0;overflow:hidden;">
        Seu código de primeiro acesso ao Astro está neste e-mail.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f2f8;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="background-color:#1c1839;padding:32px 40px;">
                            <img src="cid:astro-logo" width="166" height="41" alt="Astro" style="display:block;width:166px;height:41px;border:0;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 40px 32px;">
                            <p style="margin:0 0 12px;color:#8f00c4;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">PRIMEIRO ACESSO</p>
                            <h1 style="margin:0 0 20px;color:#1c1839;font-size:30px;line-height:1.2;font-weight:700;">Sua jornada no Astro começa aqui.</h1>
                            <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Olá, ${name}!</p>
                            <p style="margin:0 0 28px;font-size:16px;line-height:1.6;">Seu acesso está pronto. Use o código abaixo no aplicativo Astro para criar sua conta.</p>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5eafa;border:1px solid #ead6f4;border-radius:12px;">
                                <tr>
                                    <td align="center" style="padding:24px 16px;">
                                        <p style="margin:0 0 10px;color:#5d426b;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">SEU CÓDIGO DE ACESSO</p>
                                        <p style="margin:0;color:#1c1839;font-size:36px;font-weight:700;letter-spacing:8px;line-height:1.2;">${accessToken}</p>
                                    </td>
                                </tr>
                            </table>

                            <h2 style="margin:32px 0 18px;color:#1c1839;font-size:20px;line-height:1.3;">Como criar sua conta</h2>
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td valign="top" width="32" style="padding:0 12px 18px 0;color:#8f00c4;font-size:18px;font-weight:700;">01</td>
                                    <td valign="top" style="padding:0 0 18px;font-size:15px;line-height:1.5;">Copie ou anote o código de acesso acima.</td>
                                </tr>
                                <tr>
                                    <td valign="top" width="32" style="padding:0 12px 18px 0;color:#8f00c4;font-size:18px;font-weight:700;">02</td>
                                    <td valign="top" style="padding:0 0 18px;font-size:15px;line-height:1.5;">Abra o aplicativo Astro para iniciar a criação da sua conta.</td>
                                </tr>
                                <tr>
                                    <td valign="top" width="32" style="padding:0 12px 0 0;color:#8f00c4;font-size:18px;font-weight:700;">03</td>
                                    <td valign="top" style="padding:0;font-size:15px;line-height:1.5;">Digite o código no aplicativo e siga as instruções para criar sua conta.</td>
                                </tr>
                            </table>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;border-top:1px solid #e8e4ee;">
                                <tr><td colspan="2" style="padding:24px 0 14px;color:#1c1839;font-size:16px;font-weight:700;">Seus dados de acesso</td></tr>
                                <tr><td style="padding:0 12px 10px 0;color:#69627a;font-size:14px;">E-mail</td><td style="padding:0 0 10px;color:#1c1839;font-size:14px;word-break:break-word;">${email}</td></tr>
                                <tr><td style="padding:0 12px 10px 0;color:#69627a;font-size:14px;">Workspace</td><td style="padding:0 0 10px;color:#1c1839;font-size:14px;">${workspace}</td></tr>
                                <tr><td style="padding:0 12px 10px 0;color:#69627a;font-size:14px;">Unidade</td><td style="padding:0 0 10px;color:#1c1839;font-size:14px;">${unit}</td></tr>
                                <tr><td style="padding:0 12px 0 0;color:#69627a;font-size:14px;">Cargo</td><td style="padding:0;color:#1c1839;font-size:14px;">${role}</td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#1c1839;padding:24px 40px;color:#ffffff;font-size:13px;line-height:1.5;">
                            Este código é pessoal. Não compartilhe com outras pessoas.<br>
                            Se você não esperava este e-mail, ignore esta mensagem.
                        </td>
                    </tr>
                </table>
                <p style="margin:20px 0 0;color:#777083;font-size:12px;">Astro · Conformidade em órbita</p>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const text = `Olá, ${employee.nome ?? "funcionário"}!

Seu acesso ao Astro está pronto. Seu código de primeiro acesso é: ${token}

Como criar sua conta:
1. Copie ou anote o código de acesso.
2. Abra o aplicativo Astro para iniciar a criação da sua conta.
3. Digite o código no aplicativo e siga as instruções para criar sua conta.

Seus dados de acesso:
E-mail: ${employee.email ?? "-"}
Workspace: ${employee.workspace ?? "-"}
Unidade: ${employee.unidade ?? "-"}
Cargo: ${employee.cargo ?? "-"}

Este código é pessoal. Não compartilhe com outras pessoas.
Se você não esperava este e-mail, ignore esta mensagem.`;

    return { html, text };
}
