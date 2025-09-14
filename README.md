# Laboratório 2: Comunicação com gRPC

**Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas**
**Curso de Engenharia de Software - PUC Minas**

Este projeto implementa um servidor de aplicação de alta performance para um sistema de gerenciamento de tarefas, utilizando gRPC como protocolo de comunicação. O objetivo é demonstrar os benefícios do gRPC e Protocol Buffers em comparação com uma API REST/JSON tradicional, focando em performance, tipagem forte e capacidades de streaming.

Este projeto é uma evolução do sistema desenvolvido no Roteiro 1 e serve como base para o estudo de sistemas distribuídos de alto desempenho.

---

## Funcionalidades Implementadas

* **API gRPC Completa:** Operações CRUD (Criar, Ler, Atualizar, Deletar) para autenticação e gerenciamento de tarefas.
* **Contratos Fortemente Tipados:** Definição rigorosa de serviços e mensagens usando Protocol Buffers (`.proto`).
* **Autenticação com JWT:** Sistema de registro e login que gera tokens JWT para autorização das requisições de tarefas.
* **Streaming de Dados (Server-Side):**
    * `StreamTasks`: Envia uma lista de tarefas como um fluxo contínuo de dados.
    * `StreamNotifications`: Envia notificações em tempo real sobre criação, atualização ou exclusão de tarefas.
* **Paginação:** Suporte a paginação eficiente na listagem de tarefas.
* **Banco de Dados:** Persistência de dados utilizando SQLite.
* **Testes Automatizados:** Suíte de testes com Jest para validar a funcionalidade dos serviços gRPC.
* **Benchmark de Performance:** Script para comparar a latência e o uso de dados entre a implementação gRPC e a API REST do Roteiro 1.

---

## Tecnologias Utilizadas

* **Comunicação:** gRPC (`@grpc/grpc-js`, `@grpc/proto-loader`)
* **Backend:** Node.js
* **Banco de Dados:** SQLite 3
* **Autenticação:** JWT (`jsonwebtoken`), `bcryptjs`
* **Testes:** Jest
* **Ferramentas de Desenvolvimento:** Nodemon, `grpc-tools`

---

## Instalação e Execução

### Pré-requisitos
* Node.js v16+
* NPM

### Passos para Instalação

1.  Clone este repositório.
2.  Navegue até a pasta do projeto.
3.  Instale as dependências:
    ```bash
    npm install
    ```

### Executando o Projeto

#### Servidor gRPC
Para iniciar o servidor gRPC (padrão na porta `50051`):
```bash
# Modo de produção
npm start

# Modo de desenvolvimento (com reinicialização automática)
npm run dev
```

#### Cliente de Demonstração
Para executar o cliente que demonstra todas as funcionalidades da API:
```bash
npm run client
```

#### Testes Automatizados
Para rodar a suíte de testes com Jest:
```bash
npm test
```

#### Benchmark de Performance
Para rodar o benchmark, é necessário ter o servidor REST do Roteiro 1 rodando na porta `3000` e o servidor gRPC na porta `50051`.
```bash
# Em um terceiro terminal, execute:
npm run benchmark
```

---

## Documentação da API gRPC

A API é definida por dois serviços principais: `AuthService` e `TaskService`.

### AuthService (`protos/auth_service.proto`)

#### `rpc Register(RegisterRequest) returns (RegisterResponse)`
Registra um novo usuário.
* **Request:** `RegisterRequest`
* **Response:** `RegisterResponse`

#### `rpc Login(LoginRequest) returns (LoginResponse)`
Autentica um usuário e retorna um token JWT.
* **Request:** `LoginRequest`
* **Response:** `LoginResponse`

#### `rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse)`
Valida um token JWT existente.
* **Request:** `ValidateTokenRequest`
* **Response:** `ValidateTokenResponse`

### TaskService (`protos/task_service.proto`)

_Todos os métodos (exceto os de stream) exigem que o `token` JWT seja enviado no corpo da requisição._

#### `rpc CreateTask(CreateTaskRequest) returns (CreateTaskResponse)`
Cria uma nova tarefa.

#### `rpc GetTasks(GetTasksRequest) returns (GetTasksResponse)`
Lista as tarefas do usuário com suporte a filtros e paginação.

#### `rpc GetTask(GetTaskRequest) returns (GetTaskResponse)`
Busca uma tarefa específica por seu ID.

#### `rpc UpdateTask(UpdateTaskRequest) returns (UpdateTaskResponse)`
Atualiza uma tarefa existente.

#### `rpc DeleteTask(DeleteTaskRequest) returns (DeleteTaskResponse)`
Deleta uma tarefa.

#### `rpc GetTaskStats(GetTaskStatsRequest) returns (GetTaskStatsResponse)`
Retorna estatísticas (total, concluídas, pendentes) sobre as tarefas do usuário.

#### `rpc StreamTasks(StreamTasksRequest) returns (stream Task)`
Inicia um fluxo (stream) que envia todas as tarefas do usuário uma a uma.

#### `rpc StreamNotifications(StreamNotificationsRequest) returns (stream TaskNotification)`
Inicia um fluxo (stream) que envia notificações em tempo real sempre que uma tarefa do usuário é criada, atualizada ou deletada.

---

## Análise de Performance: gRPC vs. REST

Um benchmark foi executado para comparar a performance da listagem de tarefas entre esta implementação gRPC e a API REST/JSON do Roteiro 1.

### Resultados do Benchmark (50 iterações)

| Métrica | gRPC/Protobuf | REST/JSON | Vantagem gRPC |
| :--- | :--- | :--- | :--- |
| **Tempo Médio** | ~0.93ms | ~1.04ms | **~11.0% mais rápido** |
| **Uso de Dados** | ~3,500 bytes | ~4,050 bytes | **~13.6% menos dados** |
| **Taxa de Sucesso**| 100% | 100% | - |

### Conclusão da Análise

Os resultados práticos confirmam a teoria: para comunicação interna de serviços, o **gRPC demonstrou ser mais performático** que o REST, tanto em latência (velocidade de resposta) quanto em eficiência de rede (uso de dados). Isso se deve principalmente à serialização binária compacta do Protocol Buffers e ao uso do protocolo HTTP/2.