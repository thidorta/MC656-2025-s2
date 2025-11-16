# Padrão de Projeto Utilizado — Repository (Backend)

## Por que Repository aqui?

O backend precisa acessar dados de diferentes fontes (inicialmente SQLite populado pelo crawler, mas potencialmente outras como JSON files ou um banco de dados relacional mais complexo no futuro). O padrão Repository é fundamental para isolar a lógica de acesso a dados da lógica de negócio. Ele oferece uma interface abstrata para operações de CRUD e busca, permitindo que a camada de `Services` trabalhe com coleções de entidades de domínio de forma agnóstica à persistência. Isso facilita testes, permite a troca de implementações de armazenamento sem afetar a lógica de negócio e melhora a manutenibilidade.

## Onde está no código

Embora o esqueleto do projeto utilize listas mockadas, o conceito do padrão Repository já está presente na estrutura de `app/api/endpoints/` e na definição de `app/models/course.py`, que seriam os "Modelos" de dados. A camada de `Repositories` seria criada em um diretório como `app/repositories/`, e a camada de `Services` consumiria esses repositórios.

-   `backend/app/api/endpoints/courses.py` (atuando como Controller, onde os Services e Repositories seriam injetados).
-   `backend/app/models/course.py` (define a entidade `Course` que seria manipulada pelos repositórios).
-   (Conceitual) `backend/app/repositories/course_repository.py`
-   (Conceitual) `backend/app/services/course_service.py`

## Vantagens

- Reduz acoplamento.
- Facilita testes (repositories podem ser mockados).
- Suporta evolução do armazenamento sem alterar regras de negócio.
