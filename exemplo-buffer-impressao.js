const { ThermalPrinter } = require('node-thermal-printer');

console.log('=== DEMONSTRAÇÃO: BUFFER DE IMPRESSÃO ===\n');

// Simular o comportamento do microservice
async function demonstrarBuffer() {
  console.log('1. 🖨️  Criando instância da impressora...');
  const printer = new ThermalPrinter({
    type: 'epson',
    interface: 'tcp://192.168.1.100', // IP fictício
    width: 48
  });

  console.log('2. 📝  Adicionando comandos ao BUFFER INTERNO (não imprime ainda):\n');

  // Simular o processamento do conteúdo
  const content = [
    { type: 'text', value: 'RESTAURANTE EXEMPLO', style: { bold: true, align: 'center' } },
    { type: 'text', value: '=================================' },
    { type: 'text', value: 'PEDIDO #123' },
    { type: 'text', value: 'Data: 25/09/2025 - 14:30' },
    { type: 'text', value: '---------------------------------' },
    { type: 'text', value: 'Pizza Margherita........R$ 35,00' },
    { type: 'text', value: 'Refrigerante 350ml.....R$ 12,00' },
    { type: 'text', value: '---------------------------------' },
    { type: 'text', value: 'TOTAL: R$ 47,00', style: { bold: true } },
    { type: 'cut' }
  ];

  // Processar cada item (acumula no buffer)
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    
    console.log(`   ${i + 1}. Processando: ${item.type} - "${item.value || 'comando'}" → BUFFER`);
    
    // Simular o que o microservice faz
    switch (item.type) {
      case 'text':
        if (item.style?.bold) {
          printer.bold(true);
          console.log(`      ↳ Comando ESC/POS: [ESC E 1] (bold on) → BUFFER`);
        }
        if (item.style?.align === 'center') {
          printer.alignCenter();
          console.log(`      ↳ Comando ESC/POS: [ESC a 1] (center) → BUFFER`);
        }
        
        printer.print(item.value);
        console.log(`      ↳ Comando ESC/POS: ["${item.value}", LF] → BUFFER`);
        
        if (item.style?.bold) {
          printer.bold(false);
          console.log(`      ↳ Comando ESC/POS: [ESC E 0] (bold off) → BUFFER`);
        }
        if (item.style?.align === 'center') {
          printer.alignLeft();
          console.log(`      ↳ Comando ESC/POS: [ESC a 0] (left) → BUFFER`);
        }
        break;
        
      case 'cut':
        printer.cut();
        console.log(`      ↳ Comando ESC/POS: [ESC i] (cut) → BUFFER`);
        break;
    }
    
    // Pequena pausa para visualização
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n3. 📦  BUFFER INTERNO agora contém TODOS os comandos ESC/POS:');
  console.log('   [ESC E 1][ESC a 1]["RESTAURANTE EXEMPLO"][LF][ESC E 0][ESC a 0]');
  console.log('   ["================================="][LF]["PEDIDO #123"][LF]');
  console.log('   ["Data: 25/09/2025 - 14:30"][LF]["---------------------------------"][LF]');
  console.log('   ["Pizza Margherita........R$ 35,00"][LF]...[ESC i]');

  console.log('\n4. 🚀  Chamando printer.execute()...');
  console.log('   → AGORA SIM: Enviando TUDO de uma vez para a impressora!');
  console.log('   → Uma única transmissão TCP/USB/Serial');
  console.log('   → Impressora recebe sequência completa de comandos');
  
  // Em um cenário real, aqui seria:
  // await printer.execute();
  
  console.log('\n5. ✅  Resultado:');
  console.log('   → Impressora executa todos os comandos sequencialmente');
  console.log('   → Imprime todo o recibo de uma vez');
  console.log('   → Corta o papel no final');
  
  console.log('\n🎯  RESUMO:');
  console.log('   • Todos os comandos foram ACUMULADOS no buffer');
  console.log('   • NADA foi enviado até chamar execute()');
  console.log('   • execute() envia TUDO em uma única transmissão');
  console.log('   • Mais eficiente que enviar comando por comando');
}

// Executar demonstração
demonstrarBuffer().catch(console.error);
