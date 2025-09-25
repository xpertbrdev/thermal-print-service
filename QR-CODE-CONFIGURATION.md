# 📱 Configuração de QR Codes - Thermal Printer Microservice

## 🎯 **Funcionalidades Implementadas**

### **✅ Controle de Tamanho**
- **Tamanhos**: 1 a 8 (padrão: 6)
- **Configuração**: Propriedade `size` no objeto `qrCode`

### **✅ Controle de Alinhamento**
- **Opções**: `left`, `center`, `right`
- **Configuração**: Propriedade `align` no objeto `qrCode`

### **✅ Compatibilidade**
- **Formato antigo**: `value` diretamente (mantido para compatibilidade)
- **Formato novo**: Objeto `qrCode` com configurações avançadas

## 📋 **Estrutura do DTO**

### **QrCodeDto (Novo):**
```typescript
export class QrCodeDto {
  @IsString()
  value: string;           // Conteúdo do QR code (obrigatório)

  @IsOptional()
  @IsNumber()
  size?: number;           // Tamanho 1-8 (padrão: 6)

  @IsOptional()
  @IsEnum(TextAlign)
  align?: TextAlign;       // left, center, right

  @IsOptional()
  @IsNumber()
  width?: number;          // Largura personalizada (futuro)

  @IsOptional()
  @IsNumber()
  height?: number;         // Altura personalizada (futuro)
}
```

### **ContentItemDto Atualizado:**
```typescript
export class ContentItemDto {
  @IsEnum(ContentType)
  type: ContentType;       // "qr-code"

  @IsOptional()
  @IsString()
  value?: string;          // Formato antigo (compatibilidade)

  @IsOptional()
  @ValidateNested()
  @Type(() => QrCodeDto)
  qrCode?: QrCodeDto;      // Formato novo (configurações avançadas)
}
```

## 🔄 **Formatos Suportados**

### **1. Formato Simples (Compatibilidade)**
```json
{
  "type": "qr-code",
  "value": "https://exemplo.com"
}
```
- ✅ **Funciona**: Mantém compatibilidade
- 📏 **Tamanho**: 6 (padrão)
- 📍 **Alinhamento**: Esquerda (padrão)

### **2. Formato Avançado (Recomendado)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "https://exemplo.com",
    "size": 7,
    "align": "center"
  }
}
```
- ✅ **Funciona**: Configurações completas
- 📏 **Tamanho**: Configurável (1-8)
- 📍 **Alinhamento**: Configurável (left/center/right)

## 📏 **Guia de Tamanhos**

| Tamanho | Descrição | Uso Recomendado |
|---------|-----------|-----------------|
| **1-2** | Muito Pequeno | URLs curtas, códigos simples |
| **3-4** | Pequeno | Etiquetas, identificadores |
| **5-6** | Médio (Padrão) | Uso geral, links |
| **7-8** | Grande | Cupons fiscais, documentos importantes |

## 📍 **Opções de Alinhamento**

### **Left (Esquerda)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "Conteúdo",
    "align": "left"
  }
}
```
- **Uso**: Padrão, listas, etiquetas

### **Center (Centro)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "Conteúdo",
    "align": "center"
  }
}
```
- **Uso**: Cupons fiscais, documentos oficiais

### **Right (Direita)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "Conteúdo",
    "align": "right"
  }
}
```
- **Uso**: Layouts especiais, design customizado

## 🎯 **Exemplos Práticos**

### **Cupom Fiscal (Grande e Centralizado)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "35250912345678000190590010000000123|20250925|52.00",
    "size": 7,
    "align": "center"
  }
}
```

### **Etiqueta de Produto (Pequeno e à Esquerda)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "PROD123456",
    "size": 4,
    "align": "left"
  }
}
```

### **Link de Site (Médio e Centralizado)**
```json
{
  "type": "qr-code",
  "qrCode": {
    "value": "https://meurestaurante.com/cardapio",
    "size": 6,
    "align": "center"
  }
}
```

## 🔧 **Implementação Técnica**

### **Processamento no Backend:**
```typescript
private processQRCodeItem(printer: ThermalPrinter, item: ContentItemDto): void {
  // Usar qrCode se disponível, senão usar value para compatibilidade
  const qrData = item.qrCode || { value: item.value };
  
  if (!qrData.value) return;

  // Configurar alinhamento
  if (qrData.align) {
    switch (qrData.align) {
      case 'left': printer.alignLeft(); break;
      case 'center': printer.alignCenter(); break;
      case 'right': printer.alignRight(); break;
    }
  }

  // Configurar tamanho (1-8, padrão 6)
  const size = qrData.size || 6;
  
  // Imprimir QR Code
  printer.printQR(qrData.value, size);

  // Resetar alinhamento
  if (qrData.align && qrData.align !== 'left') {
    printer.alignLeft();
  }
}
```

## 📋 **Validações**

### **Campos Obrigatórios:**
- ✅ `value`: Conteúdo do QR code

### **Campos Opcionais:**
- ✅ `size`: Número entre 1-8
- ✅ `align`: "left", "center" ou "right"
- ✅ `width`: Número (reservado para futuro)
- ✅ `height`: Número (reservado para futuro)

### **Validação Automática:**
```typescript
// ✅ Válido
{
  "type": "qr-code",
  "qrCode": {
    "value": "https://exemplo.com",
    "size": 6,
    "align": "center"
  }
}

// ❌ Inválido - size fora do range
{
  "type": "qr-code", 
  "qrCode": {
    "value": "teste",
    "size": 10  // Erro: deve ser 1-8
  }
}

// ❌ Inválido - align incorreto
{
  "type": "qr-code",
  "qrCode": {
    "value": "teste",
    "align": "middle"  // Erro: deve ser left/center/right
  }
}
```

## 🚀 **Como Testar**

### **1. Importe a Collection:**
- `QR-Code-Examples.postman_collection.json`

### **2. Teste os Exemplos:**
- **QR Code Simples**: Formato de compatibilidade
- **Tamanho Pequeno**: size: 3
- **Tamanho Grande**: size: 8
- **Alinhamentos**: left, center, right
- **Múltiplos Tamanhos**: Comparação visual
- **Cupom Fiscal**: Exemplo completo

### **3. Monitore os Resultados:**
- Use `GET /print/status/:sessionId` para acompanhar
- Verifique o dashboard: `GET /monitoring/dashboard`

## 🎯 **Casos de Uso Recomendados**

### **Restaurante:**
```json
// Cardápio Digital
{"value": "https://cardapio.com", "size": 6, "align": "center"}

// Pedido Online  
{"value": "https://pedido.com/123", "size": 5, "align": "center"}
```

### **Varejo:**
```json
// Etiqueta de Produto
{"value": "PROD123", "size": 4, "align": "left"}

// Cupom de Desconto
{"value": "DESC20OFF", "size": 6, "align": "center"}
```

### **Fiscal:**
```json
// Chave de Acesso NFCe
{"value": "35250912345...", "size": 7, "align": "center"}

// Consulta Online
{"value": "https://nfce.fazenda.gov.br", "size": 6, "align": "center"}
```

**Agora você tem controle total sobre tamanho e posicionamento dos QR codes!** 🎉
