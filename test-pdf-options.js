const { pdfToPng } = require('pdf-to-png-converter');

// PDF simples
const pdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjAgMCAwIHJnCjAgMCAwIFJHCjU2LjY5MyA3ODUuMTk3IG0KNTYuNjkzIDc0MS4yNzMgbApTCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMzOQolJUVPRg==';
const pdfBuffer = Buffer.from(pdfBase64, 'base64');

async function testOptions() {
  console.log('🔍 Testando opções do pdf-to-png-converter...\n');
  
  try {
    // Teste 1: Opções básicas
    console.log('📋 Teste 1: Opções básicas');
    const result1 = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMaskFunc: (pageNumber) => `test_${pageNumber}`,
      // Sem pngOptions - ver se funciona
    });
    console.log('✅ Sucesso sem pngOptions');
    console.log('   Resultado:', result1.length, 'páginas');
    
    // Teste 2: Com qualidade direta
    console.log('\n📋 Teste 2: Com qualidade direta');
    const result2 = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMaskFunc: (pageNumber) => `test2_${pageNumber}`,
      quality: 100,
      // Sem pngOptions
    });
    console.log('✅ Sucesso com quality direta');
    console.log('   Resultado:', result2.length, 'páginas');
    
    // Teste 3: Com width/height diretos
    console.log('\n📋 Teste 3: Com width/height diretos');
    const result3 = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMaskFunc: (pageNumber) => `test3_${pageNumber}`,
      width: 800,
      height: 600,
    });
    console.log('✅ Sucesso com width/height diretos');
    console.log('   Resultado:', result3.length, 'páginas');
    
    // Limpeza
    const fs = require('fs');
    [result1, result2, result3].forEach(result => {
      result.forEach(page => {
        if (fs.existsSync(page.path)) {
          fs.unlinkSync(page.path);
        }
      });
    });
    
    console.log('\n✅ OPÇÕES CORRETAS DESCOBERTAS:');
    console.log('- outputFolder: string');
    console.log('- outputFileMaskFunc: function');
    console.log('- quality: number (direto, não em pngOptions)');
    console.log('- width: number (direto, não em pngOptions)');
    console.log('- height: number (direto, não em pngOptions)');
    console.log('- pagesToProcess: number[]');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testOptions();
