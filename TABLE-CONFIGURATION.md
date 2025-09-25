# 📊 Configuração de Tabelas - Thermal Printer Microservice

## 🎯 **Problema Resolvido**

### **❌ ANTES (Desalinhado):**
```
Item                 Qtd  Valor
Pizza Margherita Grande  1    R$ 35,00
Refrigerante 350ml   2    R$ 12,00
Taxa                 1    R$ 5,00
```

### **✅ AGORA (Alinhado):**
```
Item                 | Qtd | Valor    
-------------------- | --- | -------- 
Pizza Margherita...  |  1  |  R$ 35,00
Refrigerante 350ml   |  2  |  R$ 12,00
Taxa de Entrega      |  1  |  R$  5,00
```

## 🚀 **Funcionalidades Implementadas**

### **✅ Larguras Fixas por Coluna**
- **Configuração**: Propriedade `width` em cada coluna
- **Truncamento**: Texto longo é cortado com "..."
- **Padding**: Preenchimento automático com espaços

### **✅ Alinhamento por Coluna**
- **Opções**: `left`, `center`, `right`
- **Configuração**: Propriedade `align` em cada coluna
- **Padrão**: `left` se não especificado

### **✅ Separadores Customizáveis**
- **Configuração**: Propriedade `separator`
- **Padrão**: `" | "` (espaço, pipe, espaço)
- **Exemplos**: `" │ "`, `" "`, `" - "`

### **✅ Bordas Customizáveis**
- **Configuração**: Propriedade `borderChar`
- **Padrão**: `"-"` (hífen)
- **Exemplos**: `"="`, `"─"`, `"*"`

### **✅ Compatibilidade Total**
- **Formato antigo**: Funciona sem modificações
- **Formato novo**: Configurações avançadas opcionais

## 📋 **Estrutura dos DTOs**

### **TableColumnDto (Novo):**
```typescript
export class TableColumnDto {
  @IsOptional()
  @IsNumber()
  width?: number;          // Largura em caracteres

  @IsOptional()
  @IsEnum(TextAlign)
  align?: TextAlign;       // left, center, right

  @IsOptional()
  @IsString()
  padding?: string;        // Caractere de preenchimento
}
```

### **TableDto Atualizado:**
```typescript
export class TableDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headers?: string[];      // Cabeçalhos da tabela

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableRowDto)
  rows: TableRowDto[];     // Linhas da tabela

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableColumnDto)
  columns?: TableColumnDto[];  // ← NOVO: Configurações por coluna

  @IsOptional()
  @IsNumber()
  defaultColumnWidth?: number;  // ← NOVO: Largura padrão

  @IsOptional()
  @IsString()
  separator?: string;      // ← NOVO: Separador entre colunas

  @IsOptional()
  @IsString()
  borderChar?: string;     // ← NOVO: Caractere das bordas
}
```

## 🔄 **Formatos Suportados**

### **1. Formato Simples (Compatibilidade)**
```json
{
  "type": "table",
  "table": {
    "headers": ["Item", "Qtd", "Valor"],
    "rows": [
      {"cells": ["Pizza", "1", "R$ 35,00"]}
    ]
  }
}
```
- ✅ **Funciona**: Mantém compatibilidade total
- 📏 **Largura**: Automática baseada no conteúdo
- 📍 **Alinhamento**: Esquerda (padrão)

### **2. Formato Avançado (Recomendado)**
```json
{
  "type": "table",
  "table": {
    "headers": ["Item", "Qtd", "Valor"],
    "rows": [
      {"cells": ["Pizza Margherita", "1", "R$ 35,00"]}
    ],
    "columns": [
      {"width": 20, "align": "left"},
      {"width": 5, "align": "center"},
      {"width": 10, "align": "right"}
    ],
    "separator": " | ",
    "borderChar": "-"
  }
}
```
- ✅ **Funciona**: Controle total de formatação
- 📏 **Largura**: Fixa por coluna
- 📍 **Alinhamento**: Configurável por coluna

## 📏 **Configuração de Larguras**

### **Largura Específica por Coluna:**
```json
"columns": [
  {"width": 20},  // Coluna 1: 20 caracteres
  {"width": 5},   // Coluna 2: 5 caracteres
  {"width": 10}   // Coluna 3: 10 caracteres
]
```

### **Largura Padrão para Todas:**
```json
"defaultColumnWidth": 12,
"columns": [
  {"align": "left"},    // 12 caracteres, esquerda
  {"align": "center"},  // 12 caracteres, centro
  {"align": "right"}    // 12 caracteres, direita
]
```

### **Misto (Específica + Padrão):**
```json
"defaultColumnWidth": 10,
"columns": [
  {"width": 25, "align": "left"},  // 25 caracteres
  {"align": "center"},             // 10 caracteres (padrão)
  {"width": 8, "align": "right"}   // 8 caracteres
]
```

## 📍 **Opções de Alinhamento**

### **Left (Esquerda) - Padrão**
```json
{"width": 15, "align": "left"}
```
```
Pizza Margherita   
Refrigerante       
Taxa               
```

### **Center (Centro)**
```json
{"width": 15, "align": "center"}
```
```
Pizza Margherita
  Refrigerante   
      Taxa       
```

### **Right (Direita)**
```json
{"width": 15, "align": "right"}
```
```
   Pizza Margherita
       Refrigerante
               Taxa
```

## 🎨 **Separadores e Bordas**

### **Separadores Comuns:**
```json
// Padrão
"separator": " | "
// Resultado: Col1 | Col2 | Col3

// Compacto
"separator": " "
// Resultado: Col1 Col2 Col3

// Unicode
"separator": " │ "
// Resultado: Col1 │ Col2 │ Col3

// Personalizado
"separator": " - "
// Resultado: Col1 - Col2 - Col3
```

### **Caracteres de Borda:**
```json
// Padrão
"borderChar": "-"
// Resultado: -------- | --- | --------

// Duplo
"borderChar": "="
// Resultado: ======== | === | ========

// Unicode
"borderChar": "─"
// Resultado: ──────── | ─── | ────────

// Personalizado
"borderChar": "*"
// Resultado: ******** | *** | ********
```

## 🎯 **Exemplos Práticos**

### **Cupom Fiscal (Alinhamento Financeiro)**
```json
{
  "type": "table",
  "table": {
    "headers": ["ITEM", "QTD", "VL UNIT", "VL TOTAL"],
    "rows": [
      {"cells": ["Pizza Margherita", "1", "35,00", "35,00"]},
      {"cells": ["Refrigerante 350ml", "2", "6,00", "12,00"]}
    ],
    "columns": [
      {"width": 22, "align": "left"},
      {"width": 3, "align": "center"},
      {"width": 7, "align": "right"},
      {"width": 8, "align": "right"}
    ],
    "separator": " ",
    "borderChar": "-"
  }
}
```

### **Relatório de Vendas (Dados Estruturados)**
```json
{
  "type": "table",
  "table": {
    "headers": ["HORA", "PEDIDO", "CLIENTE", "VALOR"],
    "rows": [
      {"cells": ["08:30", "#001", "João Silva", "R$ 45,00"]},
      {"cells": ["09:15", "#002", "Maria Santos", "R$ 32,50"]}
    ],
    "columns": [
      {"width": 6, "align": "center"},
      {"width": 6, "align": "center"},
      {"width": 12, "align": "left"},
      {"width": 10, "align": "right"}
    ],
    "separator": " │ ",
    "borderChar": "═"
  }
}
```

### **Lista Compacta (Espaço Limitado)**
```json
{
  "type": "table",
  "table": {
    "headers": ["ID", "Nome", "Status"],
    "rows": [
      {"cells": ["001", "João Silva", "Ativo"]},
      {"cells": ["002", "Maria Santos", "Inativo"]}
    ],
    "columns": [
      {"width": 4, "align": "center"},
      {"width": 12, "align": "left"},
      {"width": 8, "align": "center"}
    ],
    "separator": " │ ",
    "borderChar": "─"
  }
}
```

## 🔧 **Implementação Técnica**

### **Processamento Inteligente:**
```typescript
private processTableItem(printer: ThermalPrinter, item: ContentItemDto): void {
  const table = item.table;
  
  // Se não há configurações de colunas, usar método simples
  if (!table.columns || table.columns.length === 0) {
    this.processSimpleTable(printer, table);  // Compatibilidade
    return;
  }

  // Processar tabela com larguras fixas
  this.processAdvancedTable(printer, table);  // Novo formato
}
```

### **Formatação de Células:**
```typescript
private formatCell(text: string, width: number, align: string): string {
  // Truncar se necessário
  let content = text.length > width ? text.substring(0, width - 3) + '...' : text;
  
  // Aplicar alinhamento
  switch (align) {
    case 'center':
      const totalPadding = width - content.length;
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;
      return ' '.repeat(leftPadding) + content + ' '.repeat(rightPadding);
    
    case 'right':
      return content.padStart(width, ' ');
    
    case 'left':
    default:
      return content.padEnd(width, ' ');
  }
}
```

## 📋 **Validações**

### **Campos Obrigatórios:**
- ✅ `headers` ou `rows`: Pelo menos um deve existir
- ✅ `rows[].cells`: Array de strings

### **Campos Opcionais:**
- ✅ `columns[].width`: Número positivo
- ✅ `columns[].align`: "left", "center" ou "right"
- ✅ `defaultColumnWidth`: Número positivo
- ✅ `separator`: String qualquer
- ✅ `borderChar`: String de 1 caractere

### **Validação Automática:**
```typescript
// ✅ Válido
{
  "type": "table",
  "table": {
    "headers": ["Col1", "Col2"],
    "rows": [{"cells": ["Data1", "Data2"]}],
    "columns": [
      {"width": 10, "align": "left"},
      {"width": 15, "align": "right"}
    ]
  }
}

// ❌ Inválido - width negativa
{
  "columns": [{"width": -5}]  // Erro: deve ser positivo
}

// ❌ Inválido - align incorreto
{
  "columns": [{"align": "middle"}]  // Erro: deve ser left/center/right
}
```

## 🚀 **Como Testar**

### **1. Importe a Collection:**
- `Table-Examples.postman_collection.json`

### **2. Teste os Exemplos:**
- **Tabela Simples**: Formato de compatibilidade
- **Larguras Fixas**: Controle de largura
- **Alinhamentos**: left, center, right
- **Separadores**: Diferentes estilos
- **Cupom Fiscal**: Exemplo real
- **Relatório**: Dados estruturados

### **3. Compare os Resultados:**
- Teste primeiro sem `columns` (formato antigo)
- Depois teste com `columns` (formato novo)
- Observe o alinhamento perfeito

## 🎯 **Casos de Uso Recomendados**

### **Restaurante:**
```json
// Pedido para Cozinha
{"width": 20, "align": "left"},   // Item
{"width": 3, "align": "center"},  // Qtd
{"width": 12, "align": "left"}    // Observações

// Cupom Fiscal
{"width": 22, "align": "left"},   // Item
{"width": 3, "align": "center"},  // Qtd
{"width": 7, "align": "right"},   // Unitário
{"width": 8, "align": "right"}    // Total
```

### **Varejo:**
```json
// Etiqueta de Produto
{"width": 15, "align": "left"},   // Produto
{"width": 8, "align": "center"},  // Código
{"width": 10, "align": "right"}   // Preço

// Relatório de Vendas
{"width": 6, "align": "center"},  // Hora
{"width": 8, "align": "center"},  // Pedido
{"width": 15, "align": "left"},   // Cliente
{"width": 10, "align": "right"}   // Valor
```

### **Administrativo:**
```json
// Lista de Funcionários
{"width": 4, "align": "center"},  // ID
{"width": 20, "align": "left"},   // Nome
{"width": 10, "align": "center"}  // Status

// Controle de Estoque
{"width": 8, "align": "center"},  // Código
{"width": 18, "align": "left"},   // Produto
{"width": 6, "align": "right"},   // Qtd
{"width": 8, "align": "right"}    // Valor
```

**Agora suas tabelas ficam perfeitamente alinhadas e profissionais!** 🎉
