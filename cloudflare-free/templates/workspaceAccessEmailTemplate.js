function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

export function createWorkspaceAccessEmail(email, token) {
    const safeEmail = escapeHtml(email);
    const safeToken = escapeHtml(token);

    const html = `
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Seu acesso ao workspace Astro</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f2f8;font-family:Arial,Helvetica,sans-serif;color:#1c1839;">
    <div style="display:none;font-size:1px;line-height:1px;color:#f4f2f8;max-height:0;max-width:0;opacity:0;overflow:hidden;">
        Use este código na página de criação do workspace da empresa.
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
                        <td style="padding:40px 40px 36px;">
                            <p style="margin:0 0 12px;color:#8f00c4;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">ACESSO AO WORKSPACE</p>
                            <h1 style="margin:0 0 20px;color:#1c1839;font-size:30px;line-height:1.2;font-weight:700;">Seu primeiro passo no Astro.</h1>
                            <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Olá!</p>
                            <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Você comprou uma chave de workspace para a sua empresa. Use o código abaixo para ativá-la e continuar a criação do seu workspace no Astro.</p>
                            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;">E-mail: <strong>${safeEmail}</strong></p>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5eafa;border:1px solid #ead6f4;border-radius:12px;">
                                <tr>
                                    <td align="center" style="padding:24px 16px;">
                                        <p style="margin:0 0 10px;color:#5d426b;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Chave do workspace</p>
                                        <p style="margin:0;color:#1c1839;font-size:36px;font-weight:700;letter-spacing:8px;line-height:1.2;">${safeToken}</p>
                                    </td>
                                </tr>
                            </table>

                            <h2 style="margin:32px 0 16px;color:#1c1839;font-size:20px;line-height:1.3;">Como continuar</h2>
                            <p style="margin:0 0 10px;font-size:15px;line-height:1.6;"><strong style="color:#8f00c4;">01.</strong> Acesse a página de criação de workpace no site do Astro</p>
                            <p style="margin:0 0 10px;font-size:15px;line-height:1.6;"><strong style="color:#8f00c4;">02.</strong> Informe o código para validar sua licença para criar um workspace.</p>
                            <p style="margin:0;font-size:15px;line-height:1.6;"><strong style="color:#8f00c4;">03.</strong> Continue o fluxo de criação e configuração do workspace da sua empresa.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#1c1839;padding:24px 40px;color:#ffffff;font-size:13px;line-height:1.5;">
                            Este código é pessoal. Não compartilhe com outras pessoas.<br>
                            Se você não solicitou este acesso, ignore esta mensagem.
                        </td>
                    </tr>
                </table>
                <p style="margin:20px 0 0;color:#777083;font-size:12px;">Astro · Conformidade em órbita</p>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const text = `Olá!

Você comprou uma chave de workspace para a sua empresa. Use o código abaixo para ativá-la e continuar a criação do seu workspace no Astro.
E-mail: ${email}
Chave do workspace: ${token}

Como continuar:
1. Acesse a página de criação de workpace no site do Astro
2. Informe o código para validar sua licença para criar um workspace.
3. Continue o fluxo de criação e configuração do workspace da sua empresa.

Este código é pessoal. Não compartilhe com outras pessoas.
Se você não solicitou este acesso, ignore esta mensagem.`;

    return { html, text };
}
