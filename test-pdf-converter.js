const { pdfToPng } = require('pdf-to-png-converter');
const fs = require('fs');
const path = require('path');

async function testPdfToPngConverter() {
  console.log('🧪 Testando pdf-to-png-converter...\n');

  // PDF de exemplo em base64 (PDF simples de 1 página)
  const pdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjAgMCAwIHJnCjAgMCAwIFJHCjU2LjY5MyA3ODUuMTk3IG0KNTYuNjkzIDc0MS4yNzMgbApTCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyNDUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMzOQolJUVPRg==';
  
  try {
    console.log('📄 Convertendo PDF base64 para PNG...');
    const startTime = Date.now();
    
    // Converter base64 para buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    console.log(`📊 Tamanho do PDF: ${pdfBuffer.length} bytes`);
    
    // Converter PDF para PNG
    const pngPages = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMask: 'test_page',
      pngOptions: {
        quality: 100,
        width: 800,
        height: 600
      },
      pagesToProcess: [-1] // Todas as páginas
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Conversão bem-sucedida!`);
    console.log(`📊 Páginas processadas: ${pngPages.length}`);
    console.log(`⏱️ Tempo de processamento: ${processingTime}ms`);
    
    // Verificar arquivos gerados
    pngPages.forEach((page, index) => {
      const stats = fs.statSync(page.path);
      console.log(`📄 Página ${index + 1}:`);
      console.log(`   📁 Caminho: ${page.path}`);
      console.log(`   📊 Tamanho: ${stats.size} bytes`);
      console.log(`   🖼️ Nome: ${page.name}`);
    });
    
    // Teste de diferentes qualidades
    console.log('\n🎨 Testando diferentes qualidades...');
    
    const qualities = [50, 75, 100];
    for (const quality of qualities) {
      const qualityStart = Date.now();
      
      const qualityPages = await pdfToPng(pdfBuffer, {
        outputFolder: '/tmp',
        outputFileMask: `quality_${quality}_page`,
        pngOptions: {
          quality: quality,
          width: 600,
          height: 400
        }
      });
      
      const qualityTime = Date.now() - qualityStart;
      const qualityStats = fs.statSync(qualityPages[0].path);
      
      console.log(`📊 Qualidade ${quality}%: ${qualityStats.size} bytes, ${qualityTime}ms`);
    }
    
    // Teste com páginas específicas (simulado)
    console.log('\n📑 Testando seleção de páginas...');
    const specificPages = await pdfToPng(pdfBuffer, {
      outputFolder: '/tmp',
      outputFileMask: 'specific_page',
      pngOptions: {
        quality: 95
      },
      pagesToProcess: [1] // Apenas primeira página
    });
    
    console.log(`✅ Páginas específicas: ${specificPages.length} página(s) processada(s)`);
    
    // Limpeza
    console.log('\n🧹 Limpando arquivos de teste...');
    const tempFiles = fs.readdirSync('/tmp').filter(file => 
      file.startsWith('test_page') || 
      file.startsWith('quality_') || 
      file.startsWith('specific_page')
    );
    
    tempFiles.forEach(file => {
      fs.unlinkSync(path.join('/tmp', file));
    });
    
    console.log(`🗑️ ${tempFiles.length} arquivos temporários removidos`);
    
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('✅ pdf-to-png-converter funciona perfeitamente sem dependências externas!');
    
    return {
      success: true,
      processingTime,
      pagesProcessed: pngPages.length,
      qualities: qualities,
      message: 'Conversão PDF → PNG funcionando sem dependências externas!'
    };
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('📋 Stack trace:', error.stack);
    
    return {
      success: false,
      error: error.message,
      message: 'Falha na conversão - pode precisar de fallback'
    };
  }
}

// Executar teste
testPdfToPngConverter()
  .then(result => {
    console.log('\n📊 RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
