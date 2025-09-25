# 📮 Guia da Collection Postman - Thermal Printer Microservice

## 🚀 **Como Importar e Usar**

### **1. Importar no Postman**
1. Abra o Postman
2. Clique em **Import**
3. Arraste os arquivos:
   - `Thermal-Printer-Microservice.postman_collection.json`
   - `Thermal-Printer-Environment.postman_environment.json`
4. Selecione o environment **"Thermal Printer Environment"**

### **2. Configurar Variáveis**
As principais variáveis já estão configuradas:
- `baseUrl`: `http://localhost:3000` (ajuste se necessário)
- `printerId`: `cozinha-1` (impressora padrão para testes)
- `sessionId`: Gerado automaticamente

## 📁 **Estrutura da Collection**

### **🔧 1. Configuração**
- **Configurar Impressoras**: Define múltiplas impressoras
- **Obter Configuração**: Consulta configurações atuais
- **Lista de Impressoras**: Lista todas as impressoras
- **Impressora Específica**: Detalhes de uma impressora

### **🖨️ 2. Impressão com Sessões**
- **Imprimir Completo**: Exemplo com todos os tipos de conteúdo
- **SessionId Customizado**: Usar ID personalizado
- **Imprimir com Imagem**: Incluir imagens na impressão
- **Código de Barras**: Impressão de códigos de barras

### **📊 3. Controle de Status**
- **Consultar Status**: Status de uma sessão específica
- **Cancelar Sessão**: Cancelar impressão em andamento
- **Listar Sessões**: Ver todas as sessões ativas

### **🔄 4. Gerenciamento de Filas**
- **Ver Fila**: Jobs pendentes de uma impressora
- **Limpar Fila**: Cancelar todos os jobs pendentes
- **Estatísticas**: Métricas das filas

### **📈 5. Monitoramento**
- **Dashboard**: Visão geral completa
- **Métricas**: Performance detalhada
- **Status de Saúde**: Saúde das impressoras
- **Alertas**: Alertas do sistema
- **Histórico**: Eventos de uma sessão

### **🧪 6. Testes e Utilitários**
- **Health Check**: Verificar se serviço está ativo
- **Testar Conexão**: Testar impressora específica
- **Impressão Simples**: Endpoint de compatibilidade

### **🎯 7. Cenários de Uso**
- **Pedido Cozinha**: Exemplo para restaurante
- **Etiqueta Delivery**: Exemplo para entrega
- **Cupom Fiscal**: Exemplo de nota fiscal

## 🔄 **Fluxo de Uso Recomendado**

### **Primeira Vez:**
```
1. Configurar Impressoras → POST /config
2. Verificar Health Check → GET /print/health
3. Testar Conexão → GET /print/test-connection
4. Fazer Impressão Teste → POST /print/session
```

### **Uso Normal:**
```
1. Enviar Impressão → POST /print/session
2. Capturar sessionId da resposta
3. Monitorar Status → GET /print/status/:sessionId
4. Verificar Dashboard → GET /monitoring/dashboard
```

### **Troubleshooting:**
```
1. Ver Alertas → GET /monitoring/alerts
2. Verificar Saúde → GET /monitoring/health
3. Ver Fila → GET /print/queue/:printerId
4. Limpar se necessário → DELETE /print/queue/:printerId
```

## ⚡ **Recursos Automáticos**

### **Geração de SessionId**
A collection gera automaticamente sessionIds únicos no formato:
```
sess_YYYYMMDD_HHMMSS_RANDOM
```

### **Captura de Variáveis**
- SessionIds são capturados automaticamente das respostas
- Logs de debug para requisições com erro
- Variáveis reutilizadas entre requisições

### **Scripts de Teste**
- Validação automática de respostas
- Log de erros para debug
- Captura de dados importantes

## 📋 **Exemplos de Payloads**

### **Configuração Básica:**
```json
{
  "printers": [
    {
      "id": "cozinha-1",
      "name": "Impressora da Cozinha",
      "type": "epson",
      "connectionType": "network",
      "address": "192.168.1.200"
    }
  ]
}
```

### **Impressão Simples:**
```json
{
  "printerId": "cozinha-1",
  "content": [
    {"type": "text", "value": "Teste de impressão"},
    {"type": "cut"}
  ]
}
```

### **Impressão Completa:**
```json
{
  "printerId": "cozinha-1",
  "priority": 1,
  "content": [
    {"type": "text", "value": "TÍTULO", "style": {"bold": true, "align": "center"}},
    {"type": "table", "headers": ["Item", "Valor"], "rows": [["Pizza", "R$ 35,00"]]},
    {"type": "qr_code", "value": "https://exemplo.com"},
    {"type": "cut"}
  ]
}
```

## 🎯 **Dicas de Uso**

### **Para Desenvolvimento:**
1. Use o environment de desenvolvimento
2. Monitore os logs no console do Postman
3. Use os cenários de exemplo como base
4. Teste diferentes tipos de conteúdo

### **Para Produção:**
1. Altere `baseUrl` para URL de produção
2. Configure impressoras reais
3. Use prioridades adequadas
4. Monitore alertas regularmente

### **Para Debug:**
1. Verifique o console do Postman
2. Use GET /monitoring/alerts
3. Consulte histórico de sessões
4. Teste conexões individuais

## 🚨 **Troubleshooting Comum**

### **Erro 400 - Bad Request:**
- Verificar formato do payload
- Validar IDs de impressora
- Conferir tipos de conteúdo

### **Erro 404 - Not Found:**
- SessionId pode ter expirado
- PrinterId não configurado
- Endpoint incorreto

### **Erro 500 - Internal Server Error:**
- Impressora pode estar offline
- Problemas de rede
- Verificar logs do servidor

### **Impressão não sai:**
- Testar conexão com impressora
- Verificar fila da impressora
- Conferir status da sessão

## 📞 **Suporte**

Para problemas ou dúvidas:
1. Consulte os logs do Postman
2. Verifique o dashboard de monitoramento
3. Use os endpoints de teste
4. Consulte a documentação da API

**A collection está completa e pronta para uso em desenvolvimento e produção!** 🎉
