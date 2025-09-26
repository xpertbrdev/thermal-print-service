# Correções de Timeout no Processamento de PDF

## Problema Identificado

O erro `Socket timeout` estava ocorrendo durante o processamento de PDF devido a conflitos entre:
1. Conexões de rede com impressoras térmicas
2. Processamento intensivo de PDF para PNG
3. Timeout padrão da biblioteca `node-thermal-printer`

## Soluções Implementadas

### 1. Serviço PDF Standalone

Criado `PdfStandaloneService` que processa PDFs de forma completamente isolada:

```typescript
// Sem dependências de impressora
await pdfStandaloneService.processPdfToImages(pdfInput, options)
```

**Características:**
- Timeout estendido (60 segundos)
- Configurações otimizadas para estabilidade
- Diretório temporário separado
- Zero dependências de conexões de impressora

### 2. Sistema de Fallback

O controlador agora usa uma estratégia de fallback em 3 níveis:

```typescript
1. Serviço principal (com otimização de imagens)
2. Serviço standalone (se timeout/conexão falhar)
3. Última tentativa standalone (se exceção geral)
```

### 3. Melhorias no Serviço Principal

**Isolamento de Processos:**
- Conversão PDF→PNG separada de conexões de impressora
- Otimização de imagens com tratamento de erro independente
- Timeout personalizado (30 segundos)

**Configurações Otimizadas:**
```typescript
{
  disableFontFace: true,
  useSystemFonts: false,
  viewportScale: 1.0,
  outputFilesFormat: 'png'
}
```

### 4. Tratamento de Erros Específicos

```typescript
// Detecção de timeout
if (error.message.includes('Socket timeout') || 
    error.message.includes('timeout') ||
    error.message.includes('connection')) {
  // Usar serviço standalone
}
```

## Configurações de Timeout

| Serviço | Timeout | Uso |
|---------|---------|-----|
| Principal | 30s | Conversão rápida |
| Standalone | 60s | PDFs complexos |
| Impressora | 5s | Conexão de rede |

## Endpoints Atualizados

### POST /pdf/process

**Comportamento:**
1. Tenta processamento principal
2. Se timeout → usa standalone
3. Se falha geral → última tentativa standalone

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "PDF processado com sucesso: 2 páginas",
  "data": {
    "processedPages": 2,
    "totalPages": 2,
    "processingTime": 1500,
    "outputPaths": ["/tmp/page_1.png", "/tmp/page_2.png"],
    "optimizedPaths": ["/tmp/opt_page_1.png", "/tmp/opt_page_2.png"]
  }
}
```

**Resposta de Fallback:**
```json
{
  "success": true,
  "message": "PDF processado com sucesso (modo standalone): 2 páginas",
  "data": {
    "processedPages": 2,
    "totalPages": 2,
    "processingTime": 3000,
    "outputPaths": ["/tmp/standalone_page_1.png"],
    "optimizedPaths": ["/tmp/standalone_page_1.png"]
  }
}
```

## Logs de Diagnóstico

```
[PdfController] Processando PDF para impressora: cozinha-1
[PdfService] Iniciando conversão PDF→PNG (processo isolado)
[PdfService] Erro na conversão PDF→PNG: Socket timeout
[PdfController] Serviço principal falhou, tentando standalone: Socket timeout
[PdfStandaloneService] Iniciando conversão standalone com timeout de 60s
[PdfStandaloneService] Conversão standalone concluída: 2 páginas geradas
```

## Testes Recomendados

### 1. PDF Simples
```bash
curl -X POST http://localhost:3000/pdf/process \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "default-printer",
    "pdf": "JVBERi0xLjQK...",
    "quality": 95
  }'
```

### 2. PDF Complexo (forçar standalone)
```bash
# PDF com muitas páginas ou imagens
curl -X POST http://localhost:3000/pdf/process \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "impressora-offline",
    "pdf": "data:application/pdf;base64,JVBERi0xLjQK...",
    "quality": 100
  }'
```

### 3. Verificar Estatísticas
```bash
curl http://localhost:3000/pdf/stats
```

## Monitoramento

### Métricas Importantes
- Tempo de processamento por método
- Taxa de fallback para standalone
- Uso de espaço em diretórios temporários
- Erros de timeout vs. outros erros

### Limpeza Automática
```bash
# Limpeza manual
curl -X POST http://localhost:3000/pdf/cleanup \
  -H "Content-Type: application/json" \
  -d '{"maxAgeHours": 6}'
```

## Configuração de Produção

### Variáveis de Ambiente Recomendadas
```bash
# Timeouts
PDF_CONVERSION_TIMEOUT=30000
PDF_STANDALONE_TIMEOUT=60000
PRINTER_CONNECTION_TIMEOUT=5000

# Diretórios temporários
PDF_TEMP_DIR=/tmp/thermal-printer-pdf
PDF_STANDALONE_TEMP_DIR=/tmp/thermal-printer-pdf-standalone

# Limpeza automática
PDF_CLEANUP_INTERVAL_HOURS=12
PDF_MAX_TEMP_SIZE_MB=1024
```

### Monitoramento de Logs
```bash
# Filtrar logs de PDF
grep "PdfService\|PdfStandaloneService" app.log

# Monitorar timeouts
grep "timeout\|Socket timeout" app.log

# Verificar fallbacks
grep "tentando standalone" app.log
```

## Resolução de Problemas

### Timeout Persistente
1. Verificar tamanho do PDF
2. Reduzir qualidade (quality: 80)
3. Processar páginas específicas (pages: [1, 2])
4. Verificar espaço em disco

### Falha em Ambos os Serviços
1. Verificar formato do PDF
2. Testar com PDF simples
3. Verificar permissões de diretório
4. Reiniciar serviço

### Alto Uso de Memória
1. Implementar limpeza mais frequente
2. Reduzir qualidade padrão
3. Limitar páginas simultâneas
4. Monitorar diretórios temporários
