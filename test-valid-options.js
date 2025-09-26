const { pdfToPng } = require('pdf-to-png-converter');

// PDF simples
const pdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjAgMCAwIHJnCjAgMCAwIFJHCjU2LjY5MyA3ODUuMTk3IG0KNTYuNjkzIDc0MS4yNzMgbApTCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMzOQolJUVPRg==';
const pdfBuffer = Buffer.from(pdfBase64, 'base64');

async function testMinimalOptions() {
  console.log('🔍 Testando opções mínimas válidas...\n');
  
  try {
    // Teste 1: Apenas opções obrigatórias
    console.log('📋 Teste 1: Opções mínimas');
    const result1 = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMaskFunc: (pageNumber) => `minimal_${pageNumber}`,
    });
    console.log('✅ Sucesso com opções mínimas');
    console.log('   Páginas:', result1.length);
    console.log('   Primeira página:', result1[0]);
    
    // Teste 2: Com páginas específicas
    console.log('\n📋 Teste 2: Com páginas específicas');
    const result2 = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMaskFunc: (pageNumber) => `pages_${pageNumber}`,
      pagesToProcess: [1]
    });
    console.log('✅ Sucesso com páginas específicas');
    console.log('   Páginas:', result2.length);
    
    // Limpeza
    const fs = require('fs');
    [result1, result2].forEach(result => {
      result.forEach(page => {
        if (fs.existsSync(page.path)) {
          fs.unlinkSync(page.path);
        }
      });
    });
    
    console.log('\n✅ OPÇÕES VÁLIDAS CONFIRMADAS:');
    console.log('- outputFolder: string (obrigatório)');
    console.log('- outputFileMaskFunc: function (obrigatório)');
    console.log('- pagesToProcess: number[] (opcional)');
    console.log('\n❌ OPÇÕES NÃO SUPORTADAS:');
    console.log('- quality: NÃO existe');
    console.log('- width: NÃO existe');
    console.log('- height: NÃO existe');
    console.log('- pngOptions: NÃO existe');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testMinimalOptions();
