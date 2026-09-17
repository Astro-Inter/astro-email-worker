# astro-email-worker

O projeto possui dois processos independentes:

- `npm start`: consome IDs de funcionários da fila original, consulta o PostgreSQL e envia o e-mail de primeiro acesso.
- `npm run start:workspace`: consome endereços de e-mail de outra fila, cria um código de seis dígitos no Redis e envia o e-mail para iniciar a criação de um workspace. Este processo não acessa o PostgreSQL.

## Configuração do acesso ao workspace

Configure as variáveis em `.env` (consulte `.env.example`):

| Variável | Finalidade |
| --- | --- |
| `WORKSPACE_EMAIL_QUEUE_KEY` | Lista Redis que contém apenas e-mails, por exemplo `astro:workspace:email:queue`. |
| `WORKSPACE_ACCESS_TOKEN_PREFIX` | Prefixo da chave do código, por exemplo `astro:workspace:access:token:`. |

O worker usa `LPOP` na fila. O e-mail é normalizado com `trim()` e letras minúsculas antes de compor a chave `<WORKSPACE_ACCESS_TOKEN_PREFIX><email>`. O valor é o código de seis dígitos, sem expiração automática. Um novo pedido para o mesmo e-mail substitui o código anterior.

O aplicativo principal deve consultar essa mesma chave para validar o código e concluir a criação do workspace. Este worker apenas gera e envia o código. Após o uso, o aplicativo deve remover a chave para impedir reutilização.

Se o envio falhar, o e-mail volta para o final da fila e o processo termina com erro para permitir uma nova tentativa. Um e-mail inválido é registrado e descartado. Como a retirada e a devolução do item são operações separadas, ainda existe uma janela de perda se o processo cair entre elas.

## Teste manual do fluxo de workspace

1. Preencha `REDIS_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` no `.env`. Configure também as duas variáveis de workspace acima.
2. Em PowerShell, adicione um endereço que você controla à fila (substitua `teste@exemplo.com`):

   ```powershell
   node --input-type=module -e "import 'dotenv/config'; import { createClient } from 'redis'; const client = createClient({ url: process.env.REDIS_URL }); await client.connect(); await client.rPush(process.env.WORKSPACE_EMAIL_QUEUE_KEY, 'teste@exemplo.com'); await client.quit();"
   ```

3. Execute `npm run start:workspace`. Confira no log que o e-mail foi enviado e verifique a caixa de entrada.
4. Consulte o código no Redis com o mesmo e-mail, em minúsculas:

   ```powershell
   node --input-type=module -e "import 'dotenv/config'; import { createClient } from 'redis'; const client = createClient({ url: process.env.REDIS_URL }); await client.connect(); const key = process.env.WORKSPACE_ACCESS_TOKEN_PREFIX + 'teste@exemplo.com'; console.log('Token:', await client.get(key)); await client.quit();"
   ```

O token no Redis deve coincidir com o código recebido no e-mail. A chave não expira sozinha; o aplicativo principal deve removê-la após o uso. Para testar uma falha de SMTP, use uma configuração de servidor inválida em um ambiente de teste: o processo deve sair com erro e o e-mail deve permanecer na fila.

## Execução automática no GitHub Actions

O workflow [email-workers.yml](.github/workflows/email-workers.yml) executa as duas filas a cada cinco minutos, nos minutos 3, 8, 13 e assim por diante. Também pode ser iniciado manualmente em **Actions → Processar filas de e-mail → Run workflow**. As workers são iniciadas em paralelo no mesmo job; uma falha na worker de funcionários não impede o processamento da fila de workspace. O workflow impede execuções simultâneas. O agendamento só funciona quando o arquivo estiver na branch padrão do repositório.

Configure em **Settings → Secrets and variables → Actions**:

| Tipo | Nomes |
| --- | --- |
| Secrets | `REDIS_URL`, `DATABASE_URL`, `SMTP_USER`, `SMTP_PASSWORD` |
| Variables | `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `REDIS_QUEUE_KEY`, `ACCESS_TOKEN_PREFIX`, `ACCESS_TOKEN_TTL_SECONDS`, `WORKSPACE_EMAIL_QUEUE_KEY`, `WORKSPACE_ACCESS_TOKEN_PREFIX` |

Use nas Variables os mesmos nomes de fila e prefixos usados pelo sistema que adiciona os itens e valida os tokens. O `.env` local não é enviado ao runner do GitHub. Redis, PostgreSQL e SMTP precisam aceitar conexões do runner; se estiverem em uma rede privada, será necessário um runner com acesso a essa rede.

O GitHub Actions aceita agendamento com intervalo mínimo de cinco minutos e pode atrasar ou descartar uma execução em períodos de carga. Este cron prevê 288 execuções por dia. Para processar a cada minuto com regularidade, use um serviço contínuo ou outro agendador. Em repositórios privados, verifique a franquia de minutos da organização antes de manter este workflow ativo continuamente. Em repositórios públicos, o GitHub desativa workflows agendados após 60 dias sem atividade.

### Disparo após adicionar um item à fila

Para reduzir a espera, o sistema que adiciona IDs ou e-mails ao Redis pode disparar o mesmo workflow pela API do GitHub **depois que o comando de fila for confirmado**. O workflow já aceita `workflow_dispatch`; cada execução consome as duas filas. Mantenha o cron de cinco minutos como recuperação se a chamada à API falhar. Não envie e-mail, ID ou token no pedido à API: o workflow lê os itens diretamente do Redis.

Faça a chamada no backend, nunca no navegador. Use um token de GitHub App ou um token de acesso de granularidade fina com permissão **Actions: write** apenas neste repositório. Guarde-o como segredo no sistema principal. Exemplo em Node.js:

```js
try {
    const response = await fetch(
        "https://api.github.com/repos/Astro-Inter/astro-email-worker/actions/workflows/email-workers.yml/dispatches",
        {
            method: "POST",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${process.env.GITHUB_WORKFLOW_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ref: process.env.GITHUB_WORKFLOW_REF })
        }
    );

    if (!response.ok) {
        console.error(`Falha ao disparar worker de e-mail: ${response.status}`);
    }
} catch (error) {
    console.error("Falha ao disparar worker de e-mail:", error);
}
```

Neste repositório, configure `GITHUB_WORKFLOW_REF=main`, a branch padrão atual. Execute a chamada após o `RPUSH`/`LPUSH` da fila de funcionários ou workspace retornar com sucesso. Se houver muitos itens em sequência, agrupe os disparos para evitar criar uma execução por item. A API inicia o workflow sob demanda, mas a preparação do runner ainda pode levar algum tempo; isso não oferece prazo fixo de entrega.
