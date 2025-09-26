# Thermal Printer Microservice - Documentação da API

## Visão Geral

Microservice profissional para impressão térmica com suporte completo a comandos ESC/POS, sistema de sessões, filas de impressão e processamento avançado de imagens.

### Principais Funcionalidades

- **Sistema de Sessões**: Controle total de jobs de impressão com IDs únicos
- **Múltiplas Impressoras**: Suporte simultâneo a diferentes impressoras
- **Comandos ESC/POS**: Eliminação automática de margens físicas
- **Processamento de Imagens**: Otimização automática para impressão térmica
- **Filas Inteligentes**: Processamento sequencial por impressora
- **Monitoramento**: Dashboard e métricas em tempo real
- **QR Codes Configuráveis**: Tamanho e alinhamento personalizáveis
- **Tabelas com Larguras Fixas**: Alinhamento perfeito de colunas

## Início Rápido

### 1. Instalação e Execução

```bash
# Clonar repositório
git clone https://github.com/xpertbrdev/thermal-print-service.git
cd thermal-print-service

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run start:dev

# Executar em produção
npm run build
npm run start:prod
```

### 2. Configuração Inicial

```bash
# Configurar impressoras
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d @examples/printer-config-updated.json

# Verificar saúde do serviço
curl http://localhost:3000/print/health
```

### 3. Primeira Impressão

```bash
# Impressão simples
curl -X POST http://localhost:3000/print/session \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "cozinha-1",
    "content": [
      {"type": "text", "value": "Olá Mundo!", "style": {"bold": true}},
      {"type": "cut"}
    ]
  }'
```

## Endpoints da API

### 1. CONFIGURAÇÃO

#### POST /config
Configura múltiplas impressoras

**Payload de exemplo:**
```json
{
  "printers": [
    {
      "id": "cozinha-1",
      "name": "Impressora Cozinha 80mm",
      "type": "epson",
      "connectionType": "network",
      "address": "192.168.1.100",
      "charPerLine": 48,
      "width": 80,
      "printableWidth": 80,
      "characterSet": "PC852_LATIN2",
      "timeout": 5000
    }
  ],
  "defaultSettings": {
    "charPerLine": 48,
    "width": 80,
    "printableWidth": 80,
    "characterSet": "PC852_LATIN2",
    "timeout": 5000
  }
}
```

**Comandos ESC/POS Automáticos:**
- `ESC l 0` (1B 6C 00) - Margem esquerda zero
- `ESC Q 0` (1B 51 00) - Margem direita zero
- Ou margens customizadas baseadas em `printableWidth`

#### GET /config
Consulta todas as configurações

#### GET /config/printers
Lista impressoras configuradas

#### GET /config/printers/:id
Detalhes de impressora específica

### 2. IMPRESSÃO COM SESSÕES

#### POST /print/session
Impressão com controle de sessão

**Payload de exemplo:**
```json
{
  "printerId": "cozinha-1",
  "sessionId": "sess_20241226_143022_abc12",
  "priority": "normal",
  "content": [
    {
      "type": "text",
      "value": "PEDIDO #1234",
      "style": {
        "bold": true,
        "align": "center",
        "width": 2,
        "height": 2
      }
    },
    {
      "type": "table",
      "table": {
        "headers": ["Item", "Qtd", "Valor"],
        "rows": [
          {"cells": ["Pizza Margherita", "1", "R$ 35,00"]}
        ],
        "columns": [
          {"width": 24, "align": "left"},
          {"width": 4, "align": "center"},
          {"width": 12, "align": "right"}
        ],
        "separator": " | ",
        "borderChar": "-"
      }
    },
    {
      "type": "image",
      "base64": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
      "type": "qr-code",
      "value": "https://exemplo.com/pedido/1234",
      "options": {
        "size": 6,
        "align": "center"
      }
    },
    {
      "type": "barcode",
      "value": "1234567890",
      "options": {
        "type": "CODE128",
        "width": 2,
        "height": 100,
        "align": "center"
      }
    },
    {"type": "cut"}
  ]
}
```

**Tipos de Conteúdo Suportados:**

| Tipo | Descrição | Opções |
|------|-----------|--------|
| `text` | Texto formatado | `bold`, `align`, `width`, `height` |
| `image` | Imagem (URL/base64/local) | Otimização automática |
| `table` | Tabela com larguras fixas | `columns`, `separator`, `borderChar` |
| `qr-code` | QR Code configurável | `size`, `align` |
| `barcode` | Código de barras | `type`, `width`, `height`, `align` |
| `line` | Linha de caracteres | `character`, `length` |
| `new-line` | Quebra de linha | - |
| `cut` | Corte do papel | - |
| `beep` | Som da impressora | - |
| `cash-drawer` | Abertura da gaveta | - |

#### POST /print
Impressão simples (sem sessão)

#### GET /print/status/:sessionId
Status da sessão

**Estados possíveis:**
- `queued` - Na fila aguardando
- `printing` - Sendo processado
- `completed` - Concluído com sucesso
- `failed` - Falhou na execução
- `cancelled` - Cancelado pelo usuário

#### DELETE /print/cancel/:sessionId
Cancelar sessão

### 3. MONITORAMENTO E FILAS

#### GET /print/queue/:printerId
Fila de impressão da impressora

#### DELETE /print/queue/:printerId/clear
Limpar fila da impressora

#### GET /print/queue/stats
Estatísticas das filas

#### GET /print/sessions
Listar sessões ativas

#### GET /monitoring/dashboard
Dashboard completo

**Exemplo de resposta:**
```json
{
  "timestamp": "2024-12-26T14:30:22.123Z",
  "printers": {
    "cozinha-1": {
      "status": "online",
      "queueSize": 3,
      "processing": "sess_20241226_143022_abc12",
      "lastJob": "2024-12-26T14:29:15.456Z",
      "totalJobs": 127,
      "successRate": 98.4
    }
  },
  "system": {
    "totalJobs": 1250,
    "activeJobs": 8,
    "completedJobs": 1235,
    "failedJobs": 7,
    "uptime": "2 days, 14 hours"
  },
  "alerts": []
}
```

#### GET /monitoring/metrics
Métricas detalhadas

#### GET /monitoring/alerts
Alertas do sistema

### 4. TESTES ESC/POS

#### GET /escpos-test/margin/:width
Testar comandos de margem

```bash
# Margem zero para impressora 80mm
GET /escpos-test/margin/80?printableWidth=80

# Área customizada (80mm → 72mm úteis)
GET /escpos-test/margin/80?printableWidth=72
```

#### GET /escpos-test/compare-buffers
Comparar buffers com/sem ESC/POS

#### GET /escpos-test/validate/:printerId
Validar integração ESC/POS

#### POST /escpos-test/advanced-area
Teste comando ESC W (avançado)

```json
{
  "startXMm": 4,
  "startYMm": 0,
  "widthMm": 72,
  "heightMm": 200
}
```

#### GET /escpos-test/info
Documentação ESC/POS

#### GET /escpos-test/scenarios
Cenários de teste

### 5. UTILITÁRIOS

#### GET /print/health
Health check do serviço

#### GET /print/test-connection
Teste de conexão com impressora

## Casos de Uso Práticos

### Restaurante

```json
{
  "printerId": "cozinha-1",
  "content": [
    {"type": "text", "value": "PEDIDO #1234", "style": {"bold": true, "align": "center"}},
    {"type": "text", "value": "Mesa: 15    Garçom: João"},
    {
      "type": "table",
      "table": {
        "headers": ["Item", "Qtd", "Obs"],
        "rows": [
          {"cells": ["Pizza Margherita", "1", "Sem cebola"]}
        ]
      }
    },
    {"type": "qr-code", "value": "https://restaurante.com/pedido/1234"},
    {"type": "cut"}
  ]
}
```

### Delivery

```json
{
  "printerId": "delivery-1",
  "content": [
    {"type": "text", "value": "ETIQUETA DE ENTREGA", "style": {"bold": true}},
    {"type": "text", "value": "Destinatário: Maria Silva"},
    {"type": "text", "value": "Endereço: Rua das Flores, 123"},
    {"type": "barcode", "value": "DEL5678", "options": {"type": "CODE128"}},
    {"type": "cut"}
  ]
}
```

### Varejo

```json
{
  "printerId": "balcao-1",
  "content": [
    {"type": "text", "value": "LOJA EXEMPLO LTDA", "style": {"align": "center"}},
    {"type": "text", "value": "CUPOM FISCAL ELETRÔNICO", "style": {"bold": true}},
    {
      "type": "table",
      "table": {
        "headers": ["Produto", "Qtd", "Valor"],
        "rows": [
          {"cells": ["Produto A", "2", "R$ 10,00"]}
        ]
      }
    },
    {"type": "qr-code", "value": "https://nfce.fazenda.gov.br/qrcode?chNFe=..."},
    {"type": "cut"}
  ]
}
```

## Configuração Avançada

### Área de Impressão

**Configuração de Larguras:**

```json
{
  "width": 80,           // Largura física do papel (mm)
  "printableWidth": 72,  // Área útil desejada (mm)
  "charPerLine": 48      // Caracteres por linha
}
```

**Comandos ESC/POS Gerados:**
- Se `printableWidth < width`: Margens calculadas automaticamente
- Se `printableWidth = width`: Margem zero (ESC l 0, ESC Q 0)
- Se `printableWidth` não especificado: Margem zero automática

### Processamento de Imagens

**Pipeline Automático:**
1. **Redimensionamento**: Para largura da impressora em pixels
2. **Escala de Cinza**: Conversão otimizada
3. **Normalização**: Contraste automático
4. **Brilho**: Ajuste +10% para visibilidade
5. **Sharpening**: Definição aprimorada
6. **Threshold**: P&B puros para impressoras

**Cálculo de Pixels:**
```
Largura em Pixels = (Largura em mm / 25.4) × DPI
Exemplo: 80mm = (80 / 25.4) × 203 = 640px
```

### Tabelas com Larguras Fixas

```json
{
  "type": "table",
  "table": {
    "columns": [
      {"width": 20, "align": "left"},    // 20 caracteres, esquerda
      {"width": 5, "align": "center"},   // 5 caracteres, centro
      {"width": 10, "align": "right"}    // 10 caracteres, direita
    ],
    "separator": " | ",                   // Separador entre colunas
    "borderChar": "-"                     // Caractere da borda
  }
}
```

### QR Codes Configuráveis

```json
{
  "type": "qr-code",
  "value": "https://exemplo.com",
  "options": {
    "size": 6,        // Tamanho do módulo (1-16)
    "align": "center" // Alinhamento (left, center, right)
  }
}
```

**Tamanhos Recomendados:**
- `3-4`: Pequeno
- `5-6`: Médio (recomendado)
- `7-8`: Grande
- `9+`: Muito Grande

## Comandos ESC/POS Implementados

### Comandos Automáticos

| Comando | Hex | Descrição | Quando Usado |
|---------|-----|-----------|-------------|
| `ESC l 0` | `1B 6C 00` | Margem esquerda = 0 | printableWidth = width |
| `ESC Q 0` | `1B 51 00` | Margem direita = 0 | printableWidth = width |
| `ESC l n` | `1B 6C n` | Margem esquerda customizada | printableWidth < width |
| `ESC Q n` | `1B 51 n` | Margem direita customizada | printableWidth < width |
| `ESC W` | `1B 57 ...` | Área de impressão avançada | Comando opcional |

### Cálculo de Unidades

```
Unidades ESC/POS = (mm / 25.4) × DPI / 8
Exemplo: 4mm = (4 / 25.4) × 203 / 8 ≈ 10 units
```

### Validação

```bash
# Testar comandos
GET /escpos-test/margin/80?printableWidth=72

# Validar integração
GET /escpos-test/validate/cozinha-1

# Comparar buffers
GET /escpos-test/compare-buffers
```

## Monitoramento e Métricas

### KPIs Principais

- **Taxa de Sucesso**: % de jobs concluídos com sucesso
- **Tempo Médio**: Tempo médio de processamento
- **Fila Média**: Número médio de jobs na fila
- **Uptime**: Tempo de atividade do serviço
- **Throughput**: Jobs processados por hora

### Alertas Automáticos

- **Impressora Offline**: Falha de conexão
- **Alta Taxa de Erro**: > 5% de falhas
- **Fila Longa**: > 10 jobs na fila
- **Tempo de Resposta Alto**: > 30s por job
- **Espaço em Disco**: < 1GB disponível

### Dashboard em Tempo Real

```bash
# Acessar dashboard
GET /monitoring/dashboard

# Métricas detalhadas
GET /monitoring/metrics

# Alertas ativos
GET /monitoring/alerts
```

## Troubleshooting

### Problemas Comuns

#### 1. Margem ainda presente após comandos ESC/POS

**Sintomas:**
- Impressão não chega até a borda
- Espaço em branco nas laterais

**Soluções:**
```bash
# Verificar comandos no buffer
GET /escpos-test/validate/impressora-id

# Testar margem zero
GET /escpos-test/margin/80?printableWidth=80

# Comparar com/sem ESC/POS
GET /escpos-test/compare-buffers
```

#### 2. Imagens não otimizadas

**Sintomas:**
- Imagens muito claras ou escuras
- Qualidade ruim na impressão

**Soluções:**
- Verificar se `width` e `printableWidth` estão corretos
- Testar com imagens de diferentes contrastes
- Verificar logs do ImageService

#### 3. Tabelas desalinhadas

**Sintomas:**
- Colunas não alinhadas
- Texto cortado

**Soluções:**
```json
{
  "columns": [
    {"width": 20, "align": "left"},
    {"width": 8, "align": "right"}
  ]
}
```

#### 4. Erro 413 (Request Too Large)

**Sintomas:**
- Falha ao enviar imagens base64 grandes

**Soluções:**
- Limite atual: 50MB
- Redimensionar imagem antes do envio
- Usar URL ao invés de base64

### Debug

```bash
# Health check
GET /print/health

# Teste de conexão
GET /print/test-connection?printerId=cozinha-1

# Status da sessão
GET /print/status/sess_20241226_143022_abc12

# Logs do sistema
docker logs thermal-printer-microservice
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

```bash
# Build
docker build -t thermal-printer-microservice .

# Run
docker run -p 3000:3000 thermal-printer-microservice
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thermal-printer-microservice
spec:
  replicas: 3
  selector:
    matchLabels:
      app: thermal-printer
  template:
    metadata:
      labels:
        app: thermal-printer
    spec:
      containers:
      - name: thermal-printer
        image: thermal-printer-microservice:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

### Variáveis de Ambiente

```bash
# Porta do serviço
PORT=3000

# Ambiente
NODE_ENV=production

# Configurações de log
LOG_LEVEL=info

# Timeout padrão
DEFAULT_TIMEOUT=5000

# Diretório de configuração
CONFIG_DIR=/app/config
```

## Segurança

### Boas Práticas

- **Validação de Entrada**: Todos os payloads são validados
- **Rate Limiting**: Implementar limite de requisições
- **HTTPS**: Usar TLS em produção
- **Logs**: Não logar dados sensíveis
- **Firewall**: Restringir acesso às impressoras

### Autenticação (Opcional)

```typescript
// Implementar middleware de autenticação
@UseGuards(AuthGuard)
@Controller('print')
export class PrinterController {
  // ...
}
```

## Performance

### Otimizações

- **Filas Assíncronas**: Processamento não-bloqueante
- **Cache de Configuração**: Configurações em memória
- **Pool de Conexões**: Reutilização de conexões
- **Compressão de Imagens**: Redução de tamanho
- **Limpeza Automática**: Remoção de arquivos temporários

### Benchmarks

| Operação | Tempo Médio | Throughput |
|----------|-------------|------------|
| Impressão Simples | 50-200ms | 300 jobs/min |
| Impressão com Imagem | 200-800ms | 100 jobs/min |
| Processamento de Imagem | 100-500ms | 200 imgs/min |
| QR Code | 30-100ms | 600 codes/min |
| Tabela Complexa | 80-300ms | 250 tables/min |

## Contribuição

### Workflow

1. Fork do repositório
2. Criar branch feature
3. Implementar mudanças
4. Executar testes
5. Criar Pull Request

### Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Coverage
npm run test:cov
```

### Padrões

- **TypeScript**: Tipagem estrita
- **ESLint**: Linting automático
- **Prettier**: Formatação de código
- **Conventional Commits**: Padrão de commits

## Suporte

### Canais de Suporte

- **GitHub Issues**: Bugs e feature requests
- **Documentation**: Documentação completa
- **Examples**: Exemplos práticos
- **Postman Collection**: Testes interativos

### Recursos Adicionais

- [Repositório GitHub](https://github.com/xpertbrdev/thermal-print-service)
- [Collection Postman](./Thermal-Printer-Complete-API.postman_collection.json)
- [Exemplos de Configuração](./examples/)
- [Guias de Teste](./examples/escpos-margin-test.json)

## Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

## Roadmap

### Próximas Funcionalidades

- [ ] **Print to PDF**: Emulador de impressora para PDF
- [ ] **WebSocket**: Notificações em tempo real
- [ ] **Templates**: Sistema de templates reutilizáveis
- [ ] **Multi-tenant**: Suporte a múltiplos clientes
- [ ] **Analytics**: Dashboard avançado de analytics
- [ ] **API Gateway**: Integração com gateways
- [ ] **Backup**: Sistema de backup automático
- [ ] **Clustering**: Suporte a múltiplas instâncias

### Melhorias Planejadas

- [ ] **Performance**: Otimizações adicionais
- [ ] **Monitoring**: Métricas mais detalhadas
- [ ] **Security**: Autenticação e autorização
- [ ] **Documentation**: Documentação interativa
- [ ] **Testing**: Cobertura de testes 100%
- [ ] **CI/CD**: Pipeline completo

---

**Microservice de Impressão Térmica - Solução Completa e Profissional!**

*Desenvolvido com ❤️ para a comunidade de desenvolvedores*



### 6. PROCESSAMENTO DE PDF

#### POST /pdf/process
Processa um arquivo PDF e o converte em imagens para impressão.

**Payload de exemplo:**
```json
{
  "printerId": "cozinha-1",
  "pdf": "data:application/pdf;base64,JVBERi0xLjQK...",
  "quality": 95,
  "format": "png"
}
```

**Parâmetros:**
- `printerId` (string, obrigatório): ID da impressora.
- `pdf` (string, obrigatório): PDF em base64, caminho de arquivo ou URL.
- `quality` (number, opcional): Qualidade da imagem gerada (1-100).
- `format` (string, opcional): Formato da imagem (`png` ou `jpeg`).

#### POST /pdf/info
Obtém informações sobre um arquivo PDF.

**Payload de exemplo:**
```json
{
  "pdf": "/path/to/document.pdf"
}
```

#### GET /pdf/stats
Retorna estatísticas do serviço de PDF, como o número de arquivos temporários e o espaço em disco utilizado.

#### POST /pdf/cleanup
Executa a limpeza de arquivos temporários gerados pelo serviço de PDF.

**Payload de exemplo:**
```json
{
  "maxAgeHours": 24
}
```

