# Microservice de Impressão Térmica

![Nest Logo](https://nestjs.com/img/logo-small.svg)

Um microservice robusto e flexível construído com **Node.js** e **NestJS** para atuar como uma interface de impressão para impressoras térmicas que utilizam o padrão de comandos **ESC/POS**.

## 🚀 Visão Geral

O objetivo deste projeto é abstrair a complexidade da comunicação direta com impressoras térmicas, oferecendo uma API RESTful simples e intuitiva para o envio de conteúdo a ser impresso. O microservice é altamente configurável e suporta diversos tipos de conteúdo, incluindo texto, imagens, códigos de barras e QR codes.

## ✨ Funcionalidades

- **API RESTful Simples:** Interface intuitiva para todas as operações de impressão e configuração.
- **Configuração Dinâmica:** Gerencie as configurações das impressoras através de uma API, com os dados salvos em um arquivo `printer-config.json`.
- **Suporte a Múltiplas Impressoras:** Configure e alterne entre diferentes impressoras (rede, USB, serial).
- **Impressão de Conteúdo Rico:**
  - Texto com formatação completa (negrito, sublinhado, alinhamento, tamanho).
  - Imagens a partir de um caminho local ou URL (com download automático).
  - Tabelas com cabeçalhos e linhas customizáveis.
  - Códigos de barras (CODE128, EAN13, etc.).
  - QR Codes.
- **Comandos de Controle:** Suporte para corte de papel, abertura de gaveta e bipes sonoros.
- **Validação de Dados:** Validação automática de todas as requisições para garantir a integridade dos dados.
- **Tratamento de Imagens:** Validação de imagens locais e download seguro de imagens remotas.

## 📦 Pacote Principal Utilizado

- **[node-thermal-printer](https://github.com/Klemen1337/node-thermal-printer):** Biblioteca escolhida pela sua estabilidade, manutenção ativa, amplo suporte a diferentes marcas de impressoras e uma API intuitiva.

## 🛠️ Instalação e Execução

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd thermal-printer-microservice
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o microservice:**
    ```bash
    # Modo de desenvolvimento
    npm run start:dev

    # Modo de produção
    npm run start:prod
    ```

O serviço estará rodando em `http://localhost:3000` por padrão.

## ⚙️ Configuração

As configurações das impressoras são gerenciadas dinamicamente através dos endpoints da API `/config`.

Ao iniciar pela primeira vez, um arquivo `printer-config.json` será criado na raiz do projeto com uma configuração padrão.

**Endpoint para atualizar a configuração:** `POST /config`

**Exemplo de Payload de Configuração:**

```json
{
  "printers": [
    {
      "id": "cozinha-1",
      "name": "Impressora da Cozinha",
      "type": "epson",
      "interface": "network",
      "address": "192.168.1.200"
    },
    {
      "id": "balcao-usb",
      "name": "Impressora do Balcão",
      "type": "star",
      "interface": "usb",
      "address": "/dev/usb/lp0"
    }
  ],
  "defaultSettings": {
    "width": 42,
    "characterSet": "PC850_MULTILINGUAL"
  }
}
```

## 🔌 Endpoints da API

### Saúde do Serviço

- `GET /print/health`: Verifica o status do microservice.

### Configuração

- `POST /config`: Atualiza a configuração das impressoras.
- `GET /config`: Retorna a configuração atual.
- `GET /config/printers`: Lista todas as impressoras configuradas.
- `GET /config/printers/:id`: Retorna os detalhes de uma impressora específica.

### Impressão

- `POST /print`: Envia um job de impressão.
- `GET /print/test-connection?printerId=<id>`: Testa a conexão com uma impressora específica.

**Exemplo de Payload de Impressão (`POST /print`):**

```json
{
  "printerId": "cozinha-1",
  "content": [
    { "type": "text", "value": "Pedido #123", "style": { "bold": true, "align": "center", "width": 2, "height": 2 } },
    { "type": "image", "path": "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" },
    { "type": "table", "headers": ["Item", "Qtd"], "rows": [["Pizza", "1"], ["Refrigerante", "2"]] },
    { "type": "barcode", "value": "123456789012", "symbology": "EAN13" },
    { "type": "qr-code", "value": "https://seu-cardapio.com" },
    { "type": "cut" }
  ]
}
```

## 🧪 Testes

Para rodar os testes de ponta a ponta (end-to-end):

```bash
npm run test:e2e
```

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

