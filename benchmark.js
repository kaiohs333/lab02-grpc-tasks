const axios = require('axios');
const GrpcClient = require('./client');

class PerformanceBenchmark {
    constructor() {
        this.results = {
            grpc: { times: [], errors: 0, totalBytes: 0 },
            rest: { times: [], errors: 0, totalBytes: 0 }
        };
    }

    async setupGrpcUser() {
        const client = new GrpcClient();
        await client.initialize();
        const uniqueId = Date.now();
        const userData = {
            email: `benchmark${uniqueId}@grpc.com`,
            username: `benchmarkuser${uniqueId}`,
            password: 'benchmark123',
            first_name: 'Benchmark',
            last_name: 'User'
        };
        try {
            await client.register(userData);
        } catch (error) {}
        const loginResponse = await client.login({ identifier: userData.email, password: userData.password });
        if (loginResponse.success && loginResponse.token) {
            client.currentToken = loginResponse.token;
            return client;
        }
        throw new Error('Não foi possível obter um token gRPC');
    }

    async benchmarkGrpc(iterations = 100) {
        console.log(`\n🔬 Iniciando benchmark gRPC (${iterations} iterações)...`);
        let client;
        try {
            client = await this.setupGrpcUser();
        } catch (error) {
            console.log('❌ Falha na configuração do cliente gRPC:', error.message);
            return;
        }

        for (let i = 0; i < iterations; i++) {
            const start = process.hrtime.bigint();
            try {
                const response = await client.getTasks({ page: 1, limit: 10 });
                const end = process.hrtime.bigint();
                this.results.grpc.times.push(Number(end - start) / 1e6);
                this.results.grpc.totalBytes += JSON.stringify(response).length;
            } catch (error) {
                this.results.grpc.errors++;
            }
        }
        console.log(`✅ Benchmark gRPC concluído.`);
    }

    async setupRestUser() {
        const baseUrl = 'http://localhost:3000/api';
        const uniqueId = Date.now() + 1000;
        const userData = {
            email: `benchmarkrest${uniqueId}@rest.com`,
            username: `benchmarkrest${uniqueId}`,
            password: 'benchmark123',
            firstName: 'Benchmark',
            lastName: 'REST'
        };
        try {
            await axios.post(`${baseUrl}/auth/register`, userData).catch(() => {});
            const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
                identifier: userData.email,
                password: userData.password
            });
            console.log('✅ [REST-DEBUG] Login REST bem-sucedido.');
            return { token: loginResponse.data.data.token, baseUrl };
        } catch (error) {
            throw new Error(`Falha na autenticação REST.`);
        }
    }

    async benchmarkRest(iterations = 100) {
        console.log(`\n🌐 Iniciando benchmark REST (${iterations} iterações)...`);
        let restConfig;
        try {
            restConfig = await this.setupRestUser();
        } catch (error) {
            console.log('⚠️ Pulando benchmark REST devido à falha na configuração.');
            return;
        }

        const { token, baseUrl } = restConfig;
        const headers = { Authorization: `Bearer ${token}` };

        for (let i = 0; i < iterations; i++) {
            const start = process.hrtime.bigint();
            try {
                const response = await axios.get(`${baseUrl}/tasks?page=1&limit=10`, { headers });
                const end = process.hrtime.bigint();
                this.results.rest.times.push(Number(end - start) / 1e6);
                this.results.rest.totalBytes += JSON.stringify(response.data).length;
            } catch (error) {
                // --- NOVO LOG DE ERRO DETALHADO DENTRO DO LOOP ---
                if (this.results.rest.errors === 0) { // Loga apenas o primeiro erro
                    console.error('\n❌ ERRO NA REQUISIÇÃO DE TESTE REST:');
                    if (error.response) {
                        console.error(`   - Status: ${error.response.status}`);
                        console.error('   - Dados do Erro:', JSON.stringify(error.response.data, null, 2));
                    } else {
                        console.error(`   - Mensagem de Erro: ${error.message}`);
                    }
                }
                this.results.rest.errors++;
            }
        }
        console.log(`✅ Benchmark REST concluído.`);
    }
    
    calculateStats(times) {
        if (times.length === 0) return null;
        const sum = times.reduce((a, b) => a + b, 0);
        const mean = sum / times.length;
        const sorted = times.sort((a, b) => a - b);
        return {
            mean: mean,
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
        };
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTADOS DO BENCHMARK DE PERFORMANCE');
        console.log('='.repeat(60));

        const grpcStats = this.calculateStats(this.results.grpc.times);
        const restStats = this.calculateStats(this.results.rest.times);

        if (grpcStats && this.results.grpc.times.length > 0) {
            console.log('\n🔧 gRPC/Protocol Buffers:');
            console.log(`   - Requisições: ${this.results.grpc.times.length} sucessos, ${this.results.grpc.errors} erros`);
            console.log(`   - Tempo médio: ${grpcStats.mean.toFixed(2)}ms`);
            console.log(`   - Mediana (p50): ${grpcStats.median.toFixed(2)}ms`);
            console.log(`   - p95: ${grpcStats.p95.toFixed(2)}ms`);
            console.log(`   - Total de Bytes: ${this.results.grpc.totalBytes.toLocaleString()}`);
        }

        if (restStats && this.results.rest.times.length > 0) {
            console.log('\n🌐 REST/JSON:');
            console.log(`   - Requisições: ${this.results.rest.times.length} sucessos, ${this.results.rest.errors} erros`);
            console.log(`   - Tempo médio: ${restStats.mean.toFixed(2)}ms`);
            console.log(`   - Mediana (p50): ${restStats.median.toFixed(2)}ms`);
            console.log(`   - p95: ${restStats.p95.toFixed(2)}ms`);
            console.log(`   - Total de Bytes: ${this.results.rest.totalBytes.toLocaleString()}`);
        } else {
             console.log('\n🌐 REST/JSON:');
             console.log(`   - ⚠️ Teste não executado ou todas as ${this.results.rest.errors} requisições falharam.`);
        }

        if (grpcStats && restStats && this.results.grpc.times.length > 0 && this.results.rest.times.length > 0) {
            console.log('\n🏆 ANÁLISE COMPARATIVA:');
            const latencyImprovement = ((restStats.mean - grpcStats.mean) / restStats.mean * 100);
            const bandwidthSavings = ((this.results.rest.totalBytes - this.results.grpc.totalBytes) / this.results.rest.totalBytes * 100);
            console.log(`   - Latência: gRPC foi ${latencyImprovement.toFixed(1)}% mais rápido (em média)`);
            console.log(`   - Bandwidth: gRPC usou ${bandwidthSavings.toFixed(1)}% menos dados`);
        }
    }
}

async function runBenchmark() {
    const iterations = process.argv[2] ? parseInt(process.argv[2]) : 50;
    const benchmark = new PerformanceBenchmark();
    
    console.log(`🚀 Iniciando benchmark com ${iterations} iterações por protocolo`);
    
    await benchmark.benchmarkGrpc(iterations);
    await benchmark.benchmarkRest(iterations);
    
    benchmark.printResults();
}

runBenchmark();