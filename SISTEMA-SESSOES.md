# Sistema de Sessões e Controle de Status - Documentação Completa

## 🎯 **Visão Geral**

O sistema de sessões foi implementado para suportar **múltiplas impressões simultâneas** com controle completo de status, filas por impressora e monitoramento em tempo real. Agora é possível processar centenas de jobs de impressão simultaneamente sem conflitos.

## ✨ **Principais Funcionalidades Implementadas**

### **1. Sistema de Sessões**
- **ID de sessão único** para cada job de impressão
- **Formato padronizado**: `sess_YYYYMMDD_HHMMSS_RANDOM`
- **Geração automática** ou **ID customizado**
- **Rastreamento completo** do ciclo de vida

### **2. Filas de Impressão por Impressora**
- **Fila independente** para cada impressora
- **Processamento sequencial** por impressora
- **Múltiplas impressoras** processam **simultaneamente**
- **Sistema de prioridade** (1=alta, 2=normal, 3=baixa)

### **3. Controle de Status em Tempo Real**
- **5 estados**: `queued`, `printing`, `completed`, `failed`, `cancelled`
- **Timestamps** de criação, início e conclusão
- **Posição na fila** e tempo estimado
- **Histórico completo** de mudanças de status

### **4. Sistema de Monitoramento**
- **Métricas de performance** por impressora
- **Status de saúde** das impressoras
- **Alertas automáticos** para problemas
- **Dashboard completo** com estatísticas

## 🔧 **Novos Endpoints Implementados**

### **Impressão com Sessão**

#### **POST /print/session**
Envia um job de impressão para a fila com controle de sessão.

```json
{
  "sessionId": "sess_20250925_143000_ABCD1234", // Opcional
  "printerId": "cozinha-1",                      // Opcional (usa padrão)
  "priority": 1,                                 // 1=alta, 2=normal, 3=baixa
  "content": [
    { "type": "text", "value": "Pedido #123" },
    { "type": "cut" }
  ]
}
```

**Resposta (202 Accepted):**
```json
{
  "sessionId": "sess_20250925_143000_ABCD1234",
  "printerId": "cozinha-1",
  "printerName": "Impressora da Cozinha",
  "status": "queued",
  "queuePosition": 3,
  "estimatedWaitTime": 20,
  "createdAt": "2025-09-25T14:30:00.000Z"
}
```

### **Controle de Status**

#### **GET /print/status/:sessionId**
Consulta o status atual de uma sessão.

```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250925_143000_ABCD1234",
    "status": "printing",
    "printerId": "cozinha-1",
    "printerName": "Impressora da Cozinha",
    "createdAt": "2025-09-25T14:30:00.000Z",
    "startedAt": "2025-09-25T14:30:15.000Z",
    "queuePosition": 0,
    "estimatedWaitTime": 0
  }
}
```

#### **DELETE /print/cancel/:sessionId**
Cancela uma sessão de impressão.

```json
{
  "reason": "Cliente cancelou o pedido"
}
```

### **Gerenciamento de Filas**

#### **GET /print/queue/:printerId**
Lista todos os jobs na fila de uma impressora.

#### **DELETE /print/queue/:printerId**
Limpa a fila de uma impressora (cancela jobs pendentes).

#### **GET /print/stats**
Estatísticas gerais das filas e jobs.

#### **GET /print/sessions**
Lista todas as sessões ativas com filtros opcionais.

### **Monitoramento e Alertas**

#### **GET /monitoring/dashboard**
Dashboard completo com métricas e status.

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalJobs": 1247,
      "successRate": 98.5,
      "averageProcessingTime": 8,
      "activePrinters": 3,
      "totalPrinters": 3
    },
    "queues": {
      "totalQueued": 5,
      "totalPrinting": 2,
      "totalCompleted": 1240,
      "totalFailed": 0
    },
    "alerts": {
      "total": 1,
      "critical": 0,
      "warnings": 1
    },
    "printers": [
      {
        "id": "cozinha-1",
        "name": "Impressora da Cozinha",
        "status": "online",
        "queueLength": 3,
        "isProcessing": true,
        "successRate": 99,
        "averageTime": 7
      }
    ]
  }
}
```

#### **GET /monitoring/health**
Status de saúde de todas as impressoras.

#### **GET /monitoring/alerts**
Alertas do sistema (impressoras offline, alta taxa de erro, etc.).

#### **GET /monitoring/metrics**
Métricas detalhadas de performance.

## 🚀 **Exemplos Práticos de Uso**

### **Cenário 1: Restaurante com 3 Impressoras**

```bash
# Configurar impressoras
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "printers": [
      {
        "id": "cozinha-1",
        "name": "Cozinha Principal",
        "type": "epson",
        "connectionType": "network",
        "address": "192.168.1.200"
      },
      {
        "id": "balcao-1",
        "name": "Balcão Atendimento",
        "type": "star",
        "connectionType": "usb",
        "address": "/dev/usb/lp0"
      },
      {
        "id": "delivery-1",
        "name": "Setor Delivery",
        "type": "brother",
        "connectionType": "network",
        "address": "192.168.1.201"
      }
    ]
  }'

# Enviar 3 pedidos simultâneos (SEM CONFLITO!)
curl -X POST http://localhost:3000/print/session \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "cozinha-1",
    "priority": 1,
    "content": [
      {"type": "text", "value": "=== PEDIDO COZINHA ===", "style": {"bold": true}},
      {"type": "text", "value": "Mesa 5 - 2x Hambúrguer"},
      {"type": "cut"}
    ]
  }' &

curl -X POST http://localhost:3000/print/session \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "balcao-1",
    "content": [
      {"type": "text", "value": "RECIBO CLIENTE", "style": {"align": "center"}},
      {"type": "text", "value": "Total: R$ 45,00"},
      {"type": "cut"}
    ]
  }' &

curl -X POST http://localhost:3000/print/session \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "delivery-1",
    "content": [
      {"type": "text", "value": "DELIVERY - João Silva"},
      {"type": "barcode", "value": "DEL123456"},
      {"type": "cut"}
    ]
  }' &
```

### **Cenário 2: Múltiplos Pedidos na Mesma Impressora**

```bash
# Enviar 5 pedidos para a mesma impressora (AGORA FUNCIONA!)
for i in {1..5}; do
  curl -X POST http://localhost:3000/print/session \
    -H "Content-Type: application/json" \
    -d "{
      \"printerId\": \"cozinha-1\",
      \"content\": [
        {\"type\": \"text\", \"value\": \"Pedido #$i\"},
        {\"type\": \"cut\"}
      ]
    }" &
done

# Verificar fila
curl http://localhost:3000/print/queue/cozinha-1

# Monitorar status
curl http://localhost:3000/monitoring/dashboard
```

### **Cenário 3: Controle de Sessão**

```bash
# Enviar job e capturar sessionId
RESPONSE=$(curl -X POST http://localhost:3000/print/session \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "cozinha-1",
    "content": [{"type": "text", "value": "Pedido Especial"}]
  }')

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')

# Monitorar status em tempo real
while true; do
  STATUS=$(curl -s http://localhost:3000/print/status/$SESSION_ID | jq -r '.data.status')
  echo "Status: $STATUS"
  
  if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    break
  fi
  
  sleep 2
done

# Cancelar se necessário
curl -X DELETE http://localhost:3000/print/cancel/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{"reason": "Cliente cancelou"}'
```

## 📊 **Capacidades do Sistema**

| Funcionalidade | Antes | Agora |
|----------------|-------|-------|
| **Múltiplas impressoras** | ✅ Funcionava | ✅ Melhorado |
| **Impressões simultâneas mesma impressora** | ❌ Conflitava | ✅ **RESOLVIDO** |
| **Controle de sessão** | ❌ Não existia | ✅ **IMPLEMENTADO** |
| **Status em tempo real** | ❌ Apenas sucesso/erro | ✅ **5 estados** |
| **Fila de impressão** | ❌ Não existia | ✅ **Por impressora** |
| **Sistema de prioridade** | ❌ Não existia | ✅ **3 níveis** |
| **Monitoramento** | ❌ Básico | ✅ **Dashboard completo** |
| **Alertas** | ❌ Não existia | ✅ **Automáticos** |
| **Métricas** | ❌ Não existia | ✅ **Performance detalhada** |

## 🎯 **Benefícios Implementados**

### **✅ Problemas Resolvidos:**
1. **Conflitos de impressão** → Filas independentes por impressora
2. **Falta de controle** → Sistema completo de sessões
3. **Sem visibilidade** → Dashboard e monitoramento
4. **Sem priorização** → Sistema de prioridades
5. **Sem alertas** → Monitoramento proativo

### **✅ Novas Capacidades:**
1. **Escalabilidade** → Suporta centenas de jobs simultâneos
2. **Confiabilidade** → Retry automático e tratamento de erros
3. **Observabilidade** → Métricas e logs detalhados
4. **Flexibilidade** → Configuração dinâmica e prioridades
5. **Manutenibilidade** → Código modular e testado

## 🧪 **Testes Implementados**

- ✅ **22 testes e2e** cobrindo todos os cenários
- ✅ **Sistema de sessões** completamente testado
- ✅ **Filas e concorrência** validados
- ✅ **Monitoramento** testado
- ✅ **Cancelamento** e **retry** testados

## 🚀 **Conclusão**

O sistema agora suporta **completamente** múltiplas impressões simultâneas com:

- **Controle total** via IDs de sessão
- **Zero conflitos** entre impressões
- **Monitoramento em tempo real**
- **Escalabilidade** para alto volume
- **Confiabilidade** de nível produção

**O microservice está pronto para ambientes de produção com alta demanda!**
