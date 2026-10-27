# Serviço de e-mails — Workers Free

Implementação nativa com os bancos Redis/PostgreSQL e SMTP existentes. Sem Containers ou bindings Cloudflare pagos. Não publicar em Workers Paid. Worker `astro-email-worker`, conta Astro `25eb8d3849be3adbff3678f4ec781804`.

Ativado em 01/10/2026: `JOBS_ENABLED=true`, cron UTC `* * * * *` (a cada minuto). Workflow GitHub Actions `email-workers.yml` desativado na API, sem apagar seu arquivo remoto. CI continua ativo. Os testes `/validate` e `/run` passaram no Worker; as duas filas estavam vazias, portanto nenhum e-mail foi enviado. O primeiro disparo automático e um envio real ainda precisam de acompanhamento; a capacidade de CPU do plano Free sob carga não foi comprovada.

CA oficial obtida do projeto Aiven e instalada como `astro-aiven-ca`. Conector Hyperdrive `astro-email-db`, ID `2004ed1dbe4a460495e663c42f3b801f`, com `verify-full`, cache desativado e limite de cinco conexões. PostgreSQL `SELECT 1`, Redis e autenticação SMTP Gmail passaram. SMTP usa TLS direto na porta 465 e socket com hostname preservado para o runtime Workers; não desativa validação de certificados. Permissões Wrangler autorizadas incluem publicação de scripts, Hyperdrive e certificados. Nenhum plano pago, Container ou banco adicional foi criado.

`GET /health` retorna estado. `POST /validate` exige `Authorization: Bearer <CONTROL_TOKEN>`: consulta tamanhos das filas, verifica PostgreSQL e autentica SMTP; não remove itens, não gera códigos nem envia mensagens. `POST /run` exige o mesmo token e jobs habilitados.

Preserva os templates, a imagem inline, assuntos, critério COLABORADOR/PRE_CADASTRADO, prefixos e TTL do colaborador. O código workspace mantém o comportamento original sem TTL. Usa lotes de até cinco itens por fila e trava Redis para evitar execuções simultâneas no Cloudflare. A trava não coordena o workflow legado: desativá-lo antes da troca.

O item fica na fila até confirmação do envio. Falha SMTP preserva o item; SMTP não oferece exactly-once, então quedas entre envio e confirmação Redis podem gerar duplicatas. Nenhuma repetição automática é feita na mesma execução. Redis/TLS e SMTP precisam funcionar no runtime real; compilação e testes locais não confirmam isso.

Secrets necessários: `REDIS_URL`, `DATABASE_URL`, `SMTP_USER`, `SMTP_PASSWORD`, `CONTROL_TOKEN` (aleatório com pelo menos 32 caracteres). Variáveis: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `REDIS_QUEUE_KEY`, `ACCESS_TOKEN_PREFIX`, `ACCESS_TOKEN_TTL_SECONDS`, `WORKSPACE_EMAIL_QUEUE_KEY`, `WORKSPACE_ACCESS_TOKEN_PREFIX`, `JOBS_ENABLED`, `MAX_ITEMS`.

`npm ci`; `npm test`; `npm run deploy`. Após validação e troca, cron UTC `* * * * *`. Limites Workers Free e capacidade dos lotes precisam ser verificados antes de remover o serviço anterior.

## Grafana

O Worker envia eventos sanitizados de validação e processamento das filas por OTLP/HTTP. GRAFANA_OTLP_ENDPOINT é uma variável e GRAFANA_OTLP_HEADERS fica como Secret do Worker. A exportação não inclui conteúdo de e-mails, tokens ou endereços e não afeta o envio se falhar.
