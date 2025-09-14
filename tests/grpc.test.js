const GrpcServer = require('../server');
const GrpcClient = require('../client');

describe('gRPC Services Tests', () => {
    let server;
    let client;
    let authToken;
    let taskId;

    beforeAll(async () => {
        // Iniciar servidor gRPC em porta diferente para testes
        server = new GrpcServer();
        
        // Usar Promise para aguardar o servidor inicializar
        await new Promise((resolve, reject) => {
            server.initialize().then(() => {
                const grpc = require('@grpc/grpc-js');
                const serverCredentials = grpc.ServerCredentials.createInsecure();
                
                server.server.bindAsync('0.0.0.0:50052', serverCredentials, (error, boundPort) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    server.server.start();
                    resolve();
                });
            }).catch(reject);
        });
        
        // Aguardar um pouco mais para garantir que o servidor está pronto
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Inicializar cliente
        client = new GrpcClient('localhost:50052');
        await client.initialize();
    }, 30000);

    afterAll(async () => {
        if (server?.server) {
            await new Promise(resolve => {
                server.server.tryShutdown(() => resolve());
            });
        }
    });

    describe('Autenticação', () => {
        test('deve registrar usuário com sucesso', async () => {
            const uniqueId = Date.now();
            const response = await client.register({
                email: `test${uniqueId}@grpc.com`,
                username: `grpctest${uniqueId}`,
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            });

            expect(response.success).toBe(true);
            expect(response.token).toBeDefined();
            expect(response.user).toBeDefined();
            expect(response.user.email).toBe(`test${uniqueId}@grpc.com`);
            authToken = response.token;
            
            // Configurar o token no cliente para próximos testes
            client.currentToken = response.token;
        });

        test('deve fazer login com sucesso', async () => {
            // Criar um novo usuário para garantir um estado limpo
            const uniqueId = Date.now() + 1;
            await client.register({
                email: `logintest${uniqueId}@grpc.com`,
                username: `logintest${uniqueId}`,
                password: 'password123',
                first_name: 'Login',
                last_name: 'Test'
            });

            const loginResponse = await client.login({
                identifier: `logintest${uniqueId}@grpc.com`,
                password: 'password123'
            });

            expect(loginResponse.success).toBe(true);
            expect(loginResponse.token).toBeDefined();
            expect(loginResponse.user).toBeDefined();
            client.currentToken = loginResponse.token;
        });
    });

    describe('Gerenciamento de Tarefas', () => {
        beforeAll(async () => {
            // Garantir que temos um token válido antes dos testes de tarefas
            if (!client.currentToken) {
                const uniqueId = Date.now() + 100;
                const regResponse = await client.register({
                    email: `tasktest${uniqueId}@grpc.com`,
                    username: `tasktest${uniqueId}`,
                    password: 'password123',
                    first_name: 'Task',
                    last_name: 'Test'
                });
                client.currentToken = regResponse.token;
            }
        });

        test('deve criar tarefa com dados válidos', async () => {
            const response = await client.createTask({
                title: 'Tarefa gRPC Test',
                description: 'Testando criação via gRPC',
                priority: 1 // MEDIUM
            });

            expect(response.success).toBe(true);
            expect(response.task).toBeDefined();
            expect(response.task.title).toBe('Tarefa gRPC Test');
            taskId = response.task.id;
        });

        test('deve listar tarefas com paginação', async () => {
            const response = await client.getTasks({
                page: 1,
                limit: 10
            });

            expect(response.success).toBe(true);
            expect(Array.isArray(response.tasks)).toBe(true);
        });

        test('deve atualizar tarefa existente', async () => {
            const response = await client.updateTask(taskId, {
                title: 'Tarefa Atualizada via gRPC',
                completed: true
            });

            expect(response.success).toBe(true);
            expect(response.task.title).toBe('Tarefa Atualizada via gRPC');
            expect(response.task.completed).toBe(true);
        });

        test('deve deletar tarefa existente', async () => {
            const response = await client.deleteTask(taskId);
            expect(response.success).toBe(true);
            expect(response.message).toContain('deletada com sucesso');
        });
    });
});