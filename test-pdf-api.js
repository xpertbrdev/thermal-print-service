const { pdfToPng } = require('pdf-to-png-converter');

// Testar API e opções disponíveis
async function testPdfApi() {
  console.log('🔍 Testando API do pdf-to-png-converter...\n');
  
  // PDF simples em base64
  const pdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjAgMCAwIHJnCjAgMCAwIFJHCjU2LjY5MyA3ODUuMTk3IG0KNTYuNjkzIDc0MS4yNzMgbApTCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMzOQolJUVPRg==';
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  
  try {
    console.log('📋 Testando opções básicas...');
    
    // Teste 1: Opções mínimas
    const result1 = await pdfToPng(pdfBuffer, {
      // Deixar vazio para ver opções padrão
    });
    
    console.log('✅ Teste 1 - Opções padrão:');
    console.log('   Páginas:', result1.length);
    if (result1.length > 0) {
      console.log('   Primeira página:', result1[0].name);
      console.log('   Caminho:', result1[0].path);
    }
    
    // Teste 2: Com opções específicas
    console.log('\n📋 Testando opções específicas...');
    const result2 = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMaskFunc: (pageNumber) => `test_page_${pageNumber}`,
      pngOptions: {
        quality: 100,
        width: 800,
        height: 600
      },
      pagesToProcess: [1]
    });
    
    console.log('✅ Teste 2 - Opções específicas:');
    console.log('   Páginas:', result2.length);
    if (result2.length > 0) {
      console.log('   Nome:', result2[0].name);
      console.log('   Caminho:', result2[0].path);
    }
    
    // Teste 3: Verificar estrutura de retorno
    console.log('\n📋 Estrutura de retorno:');
    if (result1.length > 0) {
      console.log('   Propriedades disponíveis:', Object.keys(result1[0]));
      console.log('   Tipo de retorno:', typeof result1[0]);
    }
    
    // Limpeza
    console.log('\n🧹 Limpando arquivos de teste...');
    const fs = require('fs');
    const path = require('path');
    
    // Limpar arquivos do teste 1
    result1.forEach(page => {
      if (fs.existsSync(page.path)) {
        fs.unlinkSync(page.path);
      }
    });
    
    // Limpar arquivos do teste 2
    result2.forEach(page => {
      if (fs.existsSync(page.path)) {
        fs.unlinkSync(page.path);
      }
    });
    
    console.log('✅ API testada com sucesso!');
    console.log('\n📊 OPÇÕES CORRETAS:');
    console.log('- outputFolder: string (pasta de saída)');
    console.log('- outputFileMaskFunc: function (nome do arquivo)');
    console.log('- pngOptions: { quality, width, height }');
    console.log('- pagesToProcess: number[] (páginas específicas)');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testPdfApi();
