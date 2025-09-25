# 🔧 Correções Aplicadas na Collection Postman

## ❌ **Erros Identificados:**

```json
{
    "message": [
        "content.7.property headers should not exist",
        "content.7.property rows should not exist", 
        "content.11.style.property size should not exist",
        "content.16.property size should not exist",
        "content.16.type must be one of the following values: text, image, table, barcode, qr-code, cut, beep, cash-drawer, line, new-line"
    ],
    "error": "Bad Request",
    "statusCode": 400
}
```

## ✅ **Correções Aplicadas:**

### **1. Estrutura de Tabelas (content.7)**

#### **❌ ANTES (Incorreto):**
```json
{
  "type": "table",
  "headers": ["Item", "Qtd", "Valor"],
  "rows": [
    ["Pizza Margherita", "1", "R$ 35,00"],
    ["Refrigerante 350ml", "2", "R$ 12,00"]
  ]
}
```

#### **✅ DEPOIS (Correto):**
```json
{
  "type": "table",
  "table": {
    "headers": ["Item", "Qtd", "Valor"],
    "rows": [
      {"cells": ["Pizza Margherita", "1", "R$ 35,00"]},
      {"cells": ["Refrigerante 350ml", "2", "R$ 12,00"]}
    ]
  }
}
```

### **2. Propriedade 'size' Não Suportada**

#### **❌ ANTES (Incorreto):**
```json
{
  "type": "text",
  "value": "TOTAL: R$ 52,00",
  "style": {
    "bold": true,
    "size": "large"  // ← Não suportado
  }
}
```

#### **✅ DEPOIS (Correto):**
```json
{
  "type": "text", 
  "value": "TOTAL: R$ 52,00",
  "style": {
    "bold": true
    // size removido
  }
}
```

### **3. Tipos de Conteúdo Incorretos**

#### **❌ ANTES (Incorreto):**
```json
{
  "type": "qr_code",  // ← Underscore incorreto
  "value": "https://exemplo.com",
  "size": 6  // ← Propriedade não suportada
}
```

#### **✅ DEPOIS (Correto):**
```json
{
  "type": "qr-code",  // ← Hífen correto
  "value": "https://exemplo.com"
  // size removido
}
```

### **4. Tipo new_line vs new-line**

#### **❌ ANTES (Incorreto):**
```json
{
  "type": "new_line"  // ← Underscore incorreto
}
```

#### **✅ DEPOIS (Correto):**
```json
{
  "type": "new-line"  // ← Hífen correto
}
```

## 📋 **Estrutura Correta dos DTOs**

### **ContentType Enum Válido:**
```typescript
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image', 
  TABLE = 'table',
  BARCODE = 'barcode',
  QR_CODE = 'qr-code',        // ← Hífen, não underscore
  CUT = 'cut',
  BEEP = 'beep',
  CASH_DRAWER = 'cash-drawer', // ← Hífen, não underscore
  LINE = 'line',
  NEW_LINE = 'new-line'        // ← Hífen, não underscore
}
```

### **TextStyleDto Válido:**
```typescript
export class TextStyleDto {
  @IsOptional() bold?: boolean;
  @IsOptional() underline?: boolean;
  @IsOptional() invert?: boolean;
  @IsOptional() @IsEnum(TextAlign) align?: TextAlign;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  // ❌ size não existe!
}
```

### **TableDto Estrutura Correta:**
```typescript
export class TableDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableRowDto)
  rows: TableRowDto[];  // ← Array de objetos com cells
}

export class TableRowDto {
  @IsArray()
  @IsString({ each: true })
  cells: string[];  // ← Propriedade cells obrigatória
}
```

## 🎯 **Exemplos Corrigidos:**

### **Impressão Simples (Funciona):**
```json
{
  "printerId": "cozinha-1",
  "priority": 1,
  "content": [
    {
      "type": "text",
      "value": "TESTE DE IMPRESSÃO",
      "style": {
        "bold": true,
        "align": "center"
      }
    },
    {
      "type": "line"
    },
    {
      "type": "text",
      "value": "Impressão realizada com sucesso!"
    },
    {
      "type": "cut"
    }
  ]
}
```

### **Tabela Correta (Funciona):**
```json
{
  "type": "table",
  "table": {
    "headers": ["Item", "Qtd", "Valor"],
    "rows": [
      {"cells": ["Pizza Margherita", "1", "R$ 35,00"]},
      {"cells": ["Refrigerante 350ml", "2", "R$ 12,00"]}
    ]
  }
}
```

### **QR Code Correto (Funciona):**
```json
{
  "type": "qr-code",
  "value": "https://exemplo.com/pedido/123"
}
```

### **Código de Barras Correto (Funciona):**
```json
{
  "type": "barcode",
  "value": "123456789",
  "symbology": "CODE128"
}
```

## 📁 **Arquivos Corrigidos:**

1. **Thermal-Printer-Microservice-Fixed.postman_collection.json** - Collection corrigida
2. **Thermal-Printer-Environment.postman_environment.json** - Environment (inalterado)
3. **POSTMAN-CORRECTIONS.md** - Este guia de correções

## ✅ **Status das Correções:**

| Erro | Status | Correção |
|------|--------|----------|
| `headers should not exist` | ✅ **CORRIGIDO** | Movido para `table.headers` |
| `rows should not exist` | ✅ **CORRIGIDO** | Movido para `table.rows` com `cells` |
| `size should not exist` | ✅ **CORRIGIDO** | Propriedade removida |
| `qr_code` tipo inválido | ✅ **CORRIGIDO** | Alterado para `qr-code` |
| `new_line` tipo inválido | ✅ **CORRIGIDO** | Alterado para `new-line` |

## 🚀 **Como Usar a Collection Corrigida:**

1. **Importe** a collection corrigida: `Thermal-Printer-Microservice-Fixed.postman_collection.json`
2. **Configure** o environment com `baseUrl = http://localhost:3000`
3. **Teste** primeiro com "Impressão Simples"
4. **Use** os exemplos corrigidos como base
5. **Monitore** o console do Postman para logs

**Agora todos os endpoints devem funcionar corretamente!** ✅
