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
| `WORKSPACE_ACCESS_TOKEN_TTL_SECONDS` | Prazo de validade do código, em segundos. |

O worker usa `LPOP` na fila. O e-mail é normalizado com `trim()` e letras minúsculas antes de compor a chave `<WORKSPACE_ACCESS_TOKEN_PREFIX><email>`. O valor é o código de seis dígitos, com TTL. Um novo pedido para o mesmo e-mail substitui o código anterior.

O aplicativo principal deve consultar essa mesma chave para validar o código e concluir a criação do workspace. Este worker apenas gera e envia o código. Após o uso, o aplicativo deve remover a chave para impedir reutilização.

Se o envio falhar, o e-mail volta para o final da fila e o processo termina com erro para permitir uma nova tentativa. Um e-mail inválido é registrado e descartado. Como a retirada e a devolução do item são operações separadas, ainda existe uma janela de perda se o processo cair entre elas.

## Teste manual do fluxo de workspace

1. Preencha `REDIS_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` no `.env`. Configure também as três variáveis de workspace acima.
2. Em PowerShell, adicione um endereço que você controla à fila (substitua `teste@exemplo.com`):

   ```powershell
   node --input-type=module -e "import 'dotenv/config'; import { createClient } from 'redis'; const client = createClient({ url: process.env.REDIS_URL }); await client.connect(); await client.rPush(process.env.WORKSPACE_EMAIL_QUEUE_KEY, 'teste@exemplo.com'); await client.quit();"
   ```

3. Execute `npm run start:workspace`. Confira no log que o e-mail foi enviado e verifique a caixa de entrada.
4. Consulte o código e o tempo restante no Redis com o mesmo e-mail, em minúsculas:

   ```powershell
   node --input-type=module -e "import 'dotenv/config'; import { createClient } from 'redis'; const client = createClient({ url: process.env.REDIS_URL }); await client.connect(); const key = process.env.WORKSPACE_ACCESS_TOKEN_PREFIX + 'teste@exemplo.com'; console.log('Token:', await client.get(key), 'TTL:', await client.ttl(key)); await client.quit();"
   ```

O token no Redis deve coincidir com o código recebido no e-mail. Para testar uma falha de SMTP, use uma configuração de servidor inválida em um ambiente de teste: o processo deve sair com erro e o e-mail deve permanecer na fila.
