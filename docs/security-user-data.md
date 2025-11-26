## Fluxo seguro de dados sensiveis (login GDE e planner)

Decisoes para manter as credenciais e os dados do planner apenas no dispositivo do usuario:

- O backend nao salva nada em disco (fim do uso de `planner.db` e snapshots em `crawler/data/user_db`). Tudo fica em memoria durante a sessao.
- O login (`POST /api/v1/auth/login`) recebe as credenciais reais do GDE, faz o login ao vivo no GDE e captura o payload do planejador. Esse payload e convertido para o formato do `user_db` e retornado na resposta. O backend descarta a senha e guarda apenas um snapshot em memoria para a sessao.
- Um token de sessao (Bearer) e gerado e devolvido no login; ele identifica apenas o snapshot em memoria. Reiniciar o backend apaga todas as sessoes.
- Endpoints protegidos:
  - `GET /api/v1/user-db/me` devolve o snapshot da sessao (precisa do Bearer token).
  - `GET /api/v1/planner/` e `PUT /api/v1/planner/modified` leem/atualizam o payload em memoria.
  - `POST /api/v1/planner/refresh` exige novo login (nenhuma credencial e armazenada).
- O app guarda o token e o snapshot em cache local (memoria) via `sessionStore`; nada e escrito em arquivo pelo backend.
- Variaveis `.env` do servidor nao recebem usuario/senha do estudante. O login usa apenas o corpo da requisicao.

Resumo de seguranca:
- Nenhuma credencial do usuario e persistida ou compartilhada.
- Nenhum arquivo sensivel e criado no repositorio (git publico) ou no servidor.
- Para atualizar dados, o usuario deve refazer o login (evita retencao de senhas).
