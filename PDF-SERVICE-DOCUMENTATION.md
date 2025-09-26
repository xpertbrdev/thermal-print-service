# 📄 PDF Service - Documentação Completa

## 🎯 **Visão Geral**

O **PdfService** é um serviço especializado para processamento de documentos PDF em impressoras térmicas. Converte PDFs em imagens otimizadas e integra-se perfeitamente com o sistema de impressão existente.

---

## ✨ **Funcionalidades Principais**

### **📋 Suporte Completo a Entrada**
- ✅ **PDF Base64** (com ou sem prefixo `data:application/pdf;base64,`)
- ✅ **Arquivo Local** (caminho absoluto)
- ✅ **URL Pública** (download automático)

### **🔄 Pipeline de Processamento**
```
PDF Input → Preparação → Conversão → Otimização → Impressão
    ↓           ↓           ↓           ↓           ↓
Base64/     Arquivo     Imagens     Ajustes     Impressora
URL/File    Temporário   PNG/JPEG    Térmicos    Física
```

### **⚙️ Otimizações Automáticas**
- **DPI Inteligente**: Calculado baseado na largura da impressora
- **Redimensionamento**: Ajuste automático para área útil
- **Escala de Cinza**: Conversão otimizada para impressão térmica
- **Contraste**: Normalização automática
- **Compressão**: PNG otimizado para qualidade

---

## 🔧 **API Endpoints**

### **1. POST /pdf/process**
Processa PDF e converte para imagens otimizadas.

**Payload:**
```json
{
  "printerId": "cozinha-1",
  "pdf": "data:application/pdf;base64,JVBERi0xLjQ...",
  "quality": 100,
  "density": 203,
  "format": "png",
  "pages": [1, 2, 3],
  "priority": "normal"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "PDF processado com sucesso: 3/3 páginas",
  "data": {
    "totalPages": 3,
    "processedPages": 3,
    "images": [
      "/temp/pdf/page.1.png",
      "/temp/pdf/page.2.png", 
      "/temp/pdf/page.3.png"
    ],
    "processingTime": 1250,
    "errors": []
  }
}
```

### **2. POST /pdf/info**
Obtém informações do PDF.

**Payload:**
```json
{
  "pdf": "https://exemplo.com/documento.pdf"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Informações obtidas com sucesso",
  "data": {
    "pages": 5,
    "size": 2048576,
    "format": "PDF",
    "encrypted": false
  }
}
```

### **3. GET /pdf/test**
Testa processamento com PDF de exemplo.

**Query Parameters:**
- `printerId` (opcional): ID da impressora (default: "cozinha-1")

**Resposta:**
```json
{
  "success": true,
  "message": "Teste de PDF executado com sucesso",
  "data": {
    "testPdf": "PDF de teste (1 página em branco)",
    "result": {
      "totalPages": 1,
      "processedPages": 1,
      "processingTime": 450,
      "errors": []
    }
  }
}
```

### **4. POST /pdf/cleanup**
Limpeza de arquivos temporários.

**Query Parameters:**
- `maxAgeHours` (opcional): Idade máxima em horas (default: 24)

### **5. GET /pdf/stats**
Estatísticas do serviço.

### **6. GET /pdf/info**
Documentação do serviço.

---

## 🖨️ **Integração com Impressão**

### **Uso no Conteúdo de Impressão**
```json
{
  "printerId": "cozinha-1",
  "content": [
    {
      "type": "text",
      "value": "DOCUMENTO ANEXO:",
      "style": {"bold": true}
    },
    {
      "type": "pdf",
      "pdf": "data:application/pdf;base64,JVBERi0xLjQ...",
      "pages": [1, 2],
      "quality": 100
    },
    {
      "type": "cut"
    }
  ]
}
```

### **Processamento Automático**
1. **PDF detectado** no conteúdo
2. **Conversão automática** para imagens
3. **Otimização térmica** aplicada
4. **Impressão sequencial** das páginas
5. **Limpeza automática** de temporários

---

## ⚙️ **Configurações Avançadas**

### **Qualidade e DPI**
| Impressora | DPI Padrão | Qualidade | Uso Recomendado |
|------------|------------|-----------|-----------------|
| **58mm** | 180 DPI | 90-100 | Cupons, recibos |
| **80mm** | 203 DPI | 95-100 | Documentos gerais |
| **112mm** | 225 DPI | 100 | Documentos detalhados |

### **Formatos Suportados**
- **PNG**: Melhor qualidade, maior tamanho
- **JPEG**: Menor tamanho, qualidade adequada

### **Páginas Específicas**
```json
{
  "pages": [1, 3, 5],     // Páginas específicas
  "pages": null           // Todas as páginas (padrão)
}
```

---

## 🔍 **Exemplos Práticos**

### **1. Cupom Fiscal PDF**
```json
{
  "printerId": "fiscal-1",
  "content": [
    {
      "type": "text",
      "value": "CUPOM FISCAL ELETRÔNICO",
      "style": {"bold": true, "align": "center"}
    },
    {
      "type": "pdf",
      "pdf": "/path/to/cupom-fiscal.pdf",
      "quality": 100
    }
  ]
}
```

### **2. Contrato Multi-página**
```json
{
  "printerId": "juridico-1", 
  "content": [
    {
      "type": "text",
      "value": "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
      "style": {"bold": true, "align": "center"}
    },
    {
      "type": "line"
    },
    {
      "type": "pdf",
      "pdf": "https://servidor.com/contratos/contrato-123.pdf",
      "pages": [1, 2, 3, 4, 5],
      "quality": 95
    },
    {
      "type": "cut"
    }
  ]
}
```

### **3. Relatório com Gráficos**
```json
{
  "printerId": "relatorios-1",
  "content": [
    {
      "type": "text", 
      "value": "RELATÓRIO MENSAL - VENDAS",
      "style": {"bold": true, "align": "center"}
    },
    {
      "type": "pdf",
      "pdf": "data:application/pdf;base64,JVBERi0xLjQ...",
      "quality": 100,
      "format": "png"
    }
  ]
}
```

---

## 📊 **Performance e Limites**

### **Tempos de Processamento**
| Páginas | Tamanho | Tempo Médio | Uso de Memória |
|---------|---------|-------------|----------------|
| **1 página** | 500KB | 200-500ms | ~10MB |
| **5 páginas** | 2MB | 800-1500ms | ~25MB |
| **10 páginas** | 5MB | 1500-3000ms | ~50MB |
| **20 páginas** | 10MB | 3000-6000ms | ~100MB |

### **Limites Configuráveis**
- **Tamanho máximo**: 50MB (configurável via body parser)
- **Páginas máximas**: Sem limite (limitado pela memória)
- **Formatos**: PDF 1.4+ (compatibilidade ampla)
- **Resolução máxima**: 600 DPI

---

## 🛠️ **Troubleshooting**

### **Problemas Comuns**

#### **1. "Erro na conversão PDF→Imagem"**
**Causa**: PDF corrompido ou criptografado
**Solução**: 
- Verificar integridade do PDF
- Usar PDF não criptografado
- Validar base64 se aplicável

#### **2. "Impressora não encontrada"**
**Causa**: printerId inválido
**Solução**:
- Verificar configuração da impressora
- Usar endpoint GET /config/printers

#### **3. "Falha ao otimizar página"**
**Causa**: Imagem muito grande ou corrompida
**Solução**:
- Reduzir qualidade/DPI
- Verificar páginas específicas
- Usar formato JPEG

#### **4. "Request entity too large"**
**Causa**: PDF excede limite de upload
**Solução**:
- Usar arquivo local ao invés de base64
- Usar URL pública
- Reduzir tamanho do PDF

### **Logs Detalhados**
```
[PdfService] Iniciando processamento de PDF para impressora: cozinha-1
[PdfService] PDF preparado em: /temp/pdf/pdf_1703123456_abc12.pdf
[PdfService] Opções de conversão: {"density":203,"format":"png","width":575}
[PdfService] PDF convertido em 3 páginas
[PdfService] Otimizando página 1/3
[ImageService] Processando imagem: /temp/pdf/page.1.png
[ImageService] Imagem otimizada: 575x800, 2.1MB
[PdfService] PDF processado com sucesso: 3/3 páginas em 1250ms
```

---

## 🔒 **Segurança e Limpeza**

### **Arquivos Temporários**
- **Localização**: `temp/pdf/`
- **Limpeza automática**: 24 horas (configurável)
- **Limpeza manual**: POST /pdf/cleanup

### **Validações**
- **Formato PDF**: Verificação de header
- **Tamanho**: Limite de 50MB
- **Tipo MIME**: Validação automática
- **Integridade**: Verificação durante conversão

### **Isolamento**
- **Diretório isolado** para cada processamento
- **Nomes únicos** com timestamp + random
- **Limpeza garantida** mesmo em caso de erro

---

## 🚀 **Próximas Funcionalidades**

### **Em Desenvolvimento**
- [ ] **Suporte a PDF criptografado** (com senha)
- [ ] **Marcas d'água** automáticas
- [ ] **Compressão inteligente** baseada no conteúdo
- [ ] **Cache de conversões** para PDFs recorrentes
- [ ] **Processamento assíncrono** para PDFs grandes
- [ ] **Webhook de conclusão** para processamento em background

### **Melhorias Planejadas**
- [ ] **OCR integrado** para PDFs escaneados
- [ ] **Rotação automática** de páginas
- [ ] **Detecção de orientação** (retrato/paisagem)
- [ ] **Suporte a PDF/A** (arquivamento)
- [ ] **Métricas avançadas** de qualidade

---

## 📈 **Monitoramento**

### **KPIs Principais**
- **Taxa de sucesso**: % de PDFs processados com sucesso
- **Tempo médio**: Tempo de processamento por página
- **Uso de memória**: Pico de memória por processamento
- **Taxa de erro**: % de falhas por tipo de erro

### **Alertas Configuráveis**
- **PDF muito grande**: > 20MB
- **Processamento lento**: > 5 segundos/página
- **Taxa de erro alta**: > 10% em 1 hora
- **Espaço em disco baixo**: < 1GB disponível

---

**O PdfService oferece uma solução completa e robusta para impressão de documentos PDF em impressoras térmicas, com otimizações específicas e integração perfeita com o ecossistema existente.** 📄✨
