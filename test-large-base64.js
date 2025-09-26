const axios = require('axios');

// Gerar uma string base64 grande para teste (simular imagem de ~5MB)
function generateLargeBase64(sizeInMB = 5) {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  const base64Size = Math.floor(sizeInBytes * 0.75); // Base64 é ~33% maior
  
  // Gerar dados aleatórios
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  
  for (let i = 0; i < base64Size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `data:image/png;base64,${result}`;
}

async function testLargeUpload() {
  console.log('🧪 Testando upload de imagem base64 grande...');
  
  try {
    // Gerar base64 de ~5MB
    console.log('📦 Gerando base64 de ~5MB...');
    const largeBase64 = generateLargeBase64(5);
    console.log(`📏 Tamanho do base64: ${(largeBase64.length / 1024 / 1024).toFixed(2)}MB`);
    
    const payload = {
      printerId: 'teste-upload',
      content: [
        {
          type: 'text',
          value: 'TESTE DE UPLOAD GRANDE',
          style: {
            bold: true,
            align: 'center',
            width: 2,
            height: 2
          }
        },
        {
          type: 'text',
          value: `Imagem base64: ${(largeBase64.length / 1024 / 1024).toFixed(2)}MB`,
          style: {
            align: 'center'
          }
        },
        {
          type: 'image',
          base64: largeBase64
        },
        {
          type: 'text',
          value: 'Upload realizado com sucesso!',
          style: {
            align: 'center',
            bold: true
          }
        },
        {
          type: 'cut'
        }
      ]
    };
    
    console.log('🚀 Enviando requisição...');
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/print/session', payload, {
      timeout: 30000, // 30 segundos de timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Upload realizado com sucesso!');
    console.log(`⏱️  Tempo de upload: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`🎯 Session ID: ${response.data.sessionId}`);
    
    // Verificar status da sessão
    if (response.data.sessionId) {
      console.log('🔍 Verificando status da sessão...');
      const statusResponse = await axios.get(`http://localhost:3000/print/status/${response.data.sessionId}`);
      console.log(`📋 Status da impressão: ${statusResponse.data.status}`);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Erro na resposta:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensagem: ${error.response.data.message}`);
      
      if (error.response.status === 413) {
        console.error('💡 Dica: O limite de upload pode precisar ser aumentado');
      }
    } else if (error.request) {
      console.error('❌ Erro na requisição:', error.message);
    } else {
      console.error('❌ Erro:', error.message);
    }
  }
}

async function testMultipleSizes() {
  console.log('🧪 Testando múltiplos tamanhos de upload...\n');
  
  const sizes = [1, 5, 10, 25]; // MB
  
  for (const size of sizes) {
    console.log(`\n📦 Testando ${size}MB...`);
    
    try {
      const base64 = generateLargeBase64(size);
      const actualSize = (base64.length / 1024 / 1024).toFixed(2);
      
      const payload = {
        printerId: 'teste-upload',
        content: [
          {
            type: 'text',
            value: `Teste ${size}MB (real: ${actualSize}MB)`,
            style: { bold: true, align: 'center' }
          },
          {
            type: 'image',
            base64: base64
          }
        ]
      };
      
      const startTime = Date.now();
      const response = await axios.post('http://localhost:3000/print/session', payload, {
        timeout: 60000 // 1 minuto
      });
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${size}MB: Sucesso em ${duration}ms`);
      
    } catch (error) {
      const status = error.response?.status || 'N/A';
      const message = error.response?.data?.message || error.message;
      console.log(`❌ ${size}MB: Falha (${status}) - ${message}`);
    }
  }
}

// Executar testes
if (require.main === module) {
  console.log('🚀 Iniciando testes de upload...\n');
  
  // Verificar se o servidor está rodando
  axios.get('http://localhost:3000/print/health')
    .then(() => {
      console.log('✅ Servidor está rodando\n');
      
      // Executar teste único
      testLargeUpload()
        .then(() => {
          console.log('\n' + '='.repeat(50));
          // Executar testes múltiplos
          return testMultipleSizes();
        })
        .then(() => {
          console.log('\n🎉 Todos os testes concluídos!');
        });
    })
    .catch(() => {
      console.error('❌ Servidor não está rodando em http://localhost:3000');
      console.error('💡 Execute: npm run start:dev');
    });
}

module.exports = { generateLargeBase64, testLargeUpload, testMultipleSizes };
